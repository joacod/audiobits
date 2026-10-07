import { AudioBitsError } from "../recipe/validate";
import type { Filter } from "../recipe/generated";
import { envelopeAt } from "./plan";
import type { Plan, PlannedLayer } from "./plan";

export interface Graph {
  stop(fade?: number): void;
  finish(): void;
}
export function checkNyquist(plan: Plan, sampleRate: number): void {
  const frequencies: number[] = [];
  for (const { layer } of plan.layers) {
    const value = layer.source.frequency;
    frequencies.push(
      ...(typeof value === "number"
        ? [value]
        : value.points.map((point) => point[1])),
    );
    frequencies.push(
      ...(layer.effects ?? []).map((effect) => effect.frequency),
    );
  }
  frequencies.push(
    ...(plan.recipe.effects ?? []).map((effect) => effect.frequency),
  );
  if (frequencies.some((frequency) => frequency >= sampleRate / 2))
    throw new AudioBitsError(
      "nyquist",
      "Recipe frequency must be below the context Nyquist frequency.",
    );
}
export function createGraph(
  context: BaseAudioContext,
  destination: AudioNode,
  plan: Plan,
  at: number,
  gainDb: number,
  pan: number,
  onFinish: () => void,
): Graph {
  checkNyquist(plan, context.sampleRate);
  const owned: AudioNode[] = [];
  const sources: OscillatorNode[] = [];
  const envelopes: { param: AudioParam; layer: PlannedLayer }[] = [];
  let finished = false;
  let stopped = false;
  let stopEnd = at + plan.lifetime;
  const releases = new Map<
    AudioParam,
    { at: number; value: number; duration: number }
  >();
  let ended = 0;
  const own = <T extends AudioNode>(node: T): T => {
    owned.push(node);
    return node;
  };
  function finish() {
    if (finished) return;
    finished = true;
    for (const source of sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* Already stopped or closed. */
      }
    }
    for (const node of owned) node.disconnect();
    onFinish();
  }
  function filters(
    input: AudioNode,
    effects: readonly Filter[] = [],
  ): AudioNode {
    let output = input;
    for (const effect of effects) {
      const filter = own(context.createBiquadFilter());
      filter.type = effect.filter;
      filter.frequency.value = effect.frequency;
      filter.Q.value = effect.q;
      output.connect(filter);
      output = filter;
    }
    return output;
  }
  try {
    const sum = own(context.createGain());
    const output = own(context.createGain());
    const panner = own(context.createStereoPanner());
    const level = 10 ** (gainDb / 20);
    let outputFade = {
      at: at + plan.lifetime - 0.005,
      value: level,
      duration: 0.005,
    };
    output.gain.setValueAtTime(level, at);
    output.gain.setValueAtTime(level, at + plan.lifetime - 0.005);
    output.gain.linearRampToValueAtTime(0, at + plan.lifetime);
    panner.pan.value = pan;
    filters(sum, plan.recipe.effects).connect(output);
    output.connect(panner);
    panner.connect(destination);
    for (const planned of plan.layers) {
      const { layer, attack, gain } = planned;
      const source = own(context.createOscillator());
      sources.push(source);
      source.type = layer.source.waveform;
      const frequency = layer.source.frequency;
      if (typeof frequency === "number")
        source.frequency.setValueAtTime(frequency, at);
      else
        frequency.points.forEach(([time, value], index) => {
          if (index === 0) source.frequency.setValueAtTime(value, at);
          else if (frequency.curve === "linear")
            source.frequency.linearRampToValueAtTime(value, at + time);
          else source.frequency.exponentialRampToValueAtTime(value, at + time);
        });
      const envelope = own(context.createGain());
      const param = envelope.gain;
      param.setValueAtTime(0, at);
      param.linearRampToValueAtTime(
        layer.envelope.decay === 0 ? gain * layer.envelope.sustain : gain,
        at + attack,
      );
      param.linearRampToValueAtTime(
        gain * layer.envelope.sustain,
        at + attack + layer.envelope.decay,
      );
      param.setValueAtTime(
        gain * layer.envelope.sustain,
        at + plan.recipe.duration,
      );
      param.linearRampToValueAtTime(
        0,
        at + plan.recipe.duration + layer.envelope.release,
      );
      envelopes.push({ param, layer: planned });
      // Layer filters precede the envelope so release also gates resonant output.
      filters(source, layer.effects).connect(envelope);
      envelope.connect(sum);
      source.onended = () => {
        if (++ended === sources.length) finish();
      };
    }
    // Build the complete graph before scheduling any source.
    for (const source of sources) {
      source.start(at);
      source.stop(at + plan.lifetime);
    }
    return {
      finish,
      stop(fade) {
        if (finished || (stopped && fade === undefined)) return;
        stopped = true;
        const now = context.currentTime;
        if (now < at) {
          finish();
          return;
        }
        let end = now;
        for (const { param, layer } of envelopes) {
          const remaining =
            Math.min(
              stopEnd,
              at + plan.recipe.duration + layer.layer.envelope.release,
            ) - now;
          const release = Math.max(
            0,
            Math.min(fade ?? layer.layer.envelope.release, remaining),
          );
          const previous = releases.get(param);
          const value = previous
            ? previous.value *
              Math.max(
                0,
                1 -
                  (now - previous.at) /
                    Math.max(previous.duration, Number.EPSILON),
              )
            : envelopeAt(layer, plan.recipe.duration, now - at);
          releases.set(param, { at: now, value, duration: release });
          param.cancelAndHoldAtTime(now);
          param.setValueAtTime(value, now);
          param.linearRampToValueAtTime(0, now + release);
          end = Math.max(end, now + release);
        }
        end = Math.max(now, Math.min(stopEnd, end + plan.filterTail));
        // Stealing is an output fade, including any ringing filters.
        if (fade !== undefined) end = Math.min(end, now + fade);
        stopEnd = end;
        const outputValue =
          now <= outputFade.at
            ? level
            : outputFade.value *
              Math.max(
                0,
                1 -
                  (now - outputFade.at) /
                    Math.max(outputFade.duration, Number.EPSILON),
              );
        outputFade = { at: now, value: outputValue, duration: end - now };
        output.gain.cancelAndHoldAtTime(now);
        output.gain.setValueAtTime(outputValue, now);
        output.gain.linearRampToValueAtTime(0, end);
        for (const source of sources) source.stop(end);
      },
    };
  } catch (error) {
    finish();
    throw error;
  }
}

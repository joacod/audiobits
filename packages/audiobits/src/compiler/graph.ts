import { AudioBitsError } from "../recipe/validate";
import type { Value, Mapping } from "../recipe/generated";
import { mapControl, noiseData, checkNoiseRate } from "./values";
import type { Controls } from "./values";
import type { ResolvedFilter } from "./plan";
import { envelopeAt } from "./plan";
import type { Plan, PlannedLayer } from "./plan";

export interface Graph {
  stop(fade?: number): void;
  finish(): void;
  set(controls: Controls): void;
}
export function checkNyquist(plan: Plan, sampleRate: number): void {
  const frequencies: number[] = [];
  function extrema(value: Value) {
    if (typeof value === "number") frequencies.push(value);
    else if ("points" in value)
      value.points.forEach(([, point]) => extrema(point));
    else frequencies.push(...("range" in value ? value.range : value.random));
  }
  for (const { definition } of plan.layers) {
    if (definition.source.type === "oscillator")
      extrema(definition.source.frequency);
    else checkNoiseRate(sampleRate);
    definition.effects?.forEach((effect) => extrema(effect.frequency));
  }
  plan.recipe.effects?.forEach((effect) => extrema(effect.frequency));
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
  const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  const envelopes: { param: AudioParam; layer: PlannedLayer }[] = [];
  let finished = false;
  let stopped = false;
  let stopEnd = at + plan.lifetime;
  const releases = new Map<
    AudioParam,
    { at: number; value: number; duration: number }
  >();
  let ended = 0;
  const bindings: {
    param: AudioParam;
    mapping: Mapping;
    db: boolean;
    start: number;
    from: number;
    to: number;
    end: number;
  }[] = [];
  function schedule(
    param: AudioParam,
    resolved:
      | number
      | {
          readonly points: readonly (readonly [number, number])[];
          readonly curve: "linear" | "exponential";
        },
    definition: Value,
    db = false,
  ) {
    const convert = (value: number) => (db ? 10 ** (value / 20) : value);
    if (typeof resolved === "number")
      param.setValueAtTime(convert(resolved), at);
    else
      resolved.points.forEach(([time, value], index) => {
        if (!index) param.setValueAtTime(convert(value), at);
        else if (resolved.curve === "exponential")
          param.exponentialRampToValueAtTime(convert(value), at + time);
        else param.linearRampToValueAtTime(convert(value), at + time);
      });
    if (
      typeof definition !== "number" &&
      "control" in definition &&
      plan.recipe.parameters![definition.control].mode === "live"
    ) {
      const initial = convert(resolved as number);
      bindings.push({
        param,
        mapping: definition,
        db,
        start: at,
        end: at,
        from: initial,
        to: initial,
      });
    }
  }
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
    for (const source of sources) if ("buffer" in source) source.buffer = null;
    for (const node of owned) node.disconnect();
    bindings.length = 0;
    envelopes.length = 0;
    releases.clear();
    owned.length = 0;
    sources.length = 0;
    onFinish();
  }
  function filters(
    input: AudioNode,
    effects: readonly ResolvedFilter[] = [],
    definitions = plan.recipe.effects ?? [],
  ): AudioNode {
    let output = input;
    for (const [index, effect] of effects.entries()) {
      const filter = own(context.createBiquadFilter());
      filter.type = effect.filter;
      schedule(
        filter.frequency,
        effect.frequency,
        definitions[index].frequency,
      );
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
    if (Number.isFinite(plan.lifetime)) {
      output.gain.setValueAtTime(level, at + plan.lifetime - 0.005);
      output.gain.linearRampToValueAtTime(0, at + plan.lifetime);
    }
    panner.pan.value = pan;
    filters(sum, plan.effects).connect(output);
    output.connect(panner);
    panner.connect(destination);
    for (const planned of plan.layers) {
      const { layer, attack, gain } = planned;
      let source: OscillatorNode | AudioBufferSourceNode;
      if (layer.source.type === "oscillator") {
        const oscillator = own(context.createOscillator());
        sources.push(oscillator);
        oscillator.type = layer.source.waveform;
        schedule(
          oscillator.frequency,
          layer.source.frequency,
          planned.definition.source.type === "oscillator"
            ? planned.definition.source.frequency
            : 440,
        );
        source = oscillator;
      } else {
        const noise = own(context.createBufferSource());
        sources.push(noise);
        const buffer = context.createBuffer(
          1,
          context.sampleRate,
          context.sampleRate,
        );
        buffer.copyToChannel(
          noiseData(context.sampleRate, planned.noiseSeed),
          0,
        );
        noise.buffer = buffer;
        noise.loop = true;
        noise.loopStart =
          Math.round(context.sampleRate * 0.02) / context.sampleRate;
        noise.loopEnd = 1;
        source = noise;
      }
      // Dynamic level uses its own gain; envelope release remains independent.
      const dynamic = typeof planned.definition.gainDb !== "number";
      const envelopeGain = dynamic ? 1 : gain;
      const envelopePlan = dynamic ? { ...planned, gain: 1 } : planned;
      const envelope = own(context.createGain());
      const param = envelope.gain;
      param.setValueAtTime(0, at);
      param.linearRampToValueAtTime(
        layer.envelope.decay === 0
          ? envelopeGain * layer.envelope.sustain
          : envelopeGain,
        at + attack,
      );
      param.linearRampToValueAtTime(
        envelopeGain * layer.envelope.sustain,
        at + attack + layer.envelope.decay,
      );
      if (Number.isFinite(plan.duration)) {
        param.setValueAtTime(
          envelopeGain * layer.envelope.sustain,
          at + plan.duration,
        );
        param.linearRampToValueAtTime(
          0,
          at + plan.duration + layer.envelope.release,
        );
      }
      envelopes.push({ param, layer: envelopePlan });
      // Layer filters precede the envelope so release also gates resonant output.
      filters(source, layer.effects, planned.definition.effects ?? []).connect(
        envelope,
      );
      if (dynamic) {
        const levelNode = own(context.createGain());
        schedule(levelNode.gain, layer.gainDb, planned.definition.gainDb, true);
        envelope.connect(levelNode);
        levelNode.connect(sum);
      } else envelope.connect(sum);
      source.onended = () => {
        if (++ended === sources.length) finish();
      };
    }
    // Build the complete graph before scheduling any source.
    for (const source of sources) {
      source.start(at);
      if (Number.isFinite(plan.lifetime)) source.stop(at + plan.lifetime);
    }
    return {
      finish,
      set(controls) {
        if (finished || stopped)
          throw new AudioBitsError("ended-voice", "Voice is no longer active.");
        const now = Math.max(at, context.currentTime);
        for (const binding of bindings) {
          const value = mapControl(binding.mapping, plan.recipe, controls);
          const target = binding.db ? 10 ** (value / 20) : value;
          if (target === binding.to) continue;
          const t =
            binding.end <= binding.start
              ? 1
              : Math.max(
                  0,
                  Math.min(
                    1,
                    (now - binding.start) / (binding.end - binding.start),
                  ),
                );
          const current = binding.from + (binding.to - binding.from) * t;
          const declaration = plan.recipe.parameters![binding.mapping.control];
          const smoothing =
            declaration.mode === "live" ? declaration.smoothing : 0;
          binding.param.cancelAndHoldAtTime(now);
          binding.param.setValueAtTime(current, now);
          binding.param.linearRampToValueAtTime(target, now + smoothing);
          Object.assign(binding, {
            start: now,
            end: now + smoothing,
            from: current,
            to: target,
          });
        }
      },
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
              at + plan.duration + layer.layer.envelope.release,
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
            : envelopeAt(layer, plan.duration, now - at);
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

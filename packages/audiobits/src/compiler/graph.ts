import { holdLinear } from "../runtime/automation";
import { AudioBitsError, oscillatorFrequencyBounds } from "../recipe/validate";
import type { Value, Mapping, Effect } from "../recipe/generated";
import { mapControl, noiseData, checkNoiseRate } from "./values";
import type { Controls } from "./values";
import type { ResolvedEffect } from "./plan";
import { effectTail, MAX_DELAY_TAIL } from "./plan";
import { envelopeAt } from "./plan";
import type { Plan, PlannedLayer } from "./plan";

export interface Graph {
  readonly stopping: boolean;
  stop(fade?: number, at?: number): void;
  finish(): void;
  set(controls: Controls): void;
}
export function checkNyquist(plan: Plan, sampleRate: number): void {
  // The loop needs one quantum and its feedforward compensation needs another.
  // Reject values that would be silently lengthened by the native feedback graph.
  for (const effect of [
    ...plan.effectChain,
    ...plan.layers.flatMap(({ layer }) => layer.effects ?? []),
  ]) {
    if (
      effect.type === "delay" &&
      effect.mix > 0 &&
      effect.feedback > 0 &&
      effect.time < 256 / sampleRate
    )
      throw new AudioBitsError(
        "delay-time",
        "Feedback delay time must be at least two render quanta (256 / sampleRate seconds).",
      );
  }
  const frequencies: number[] = [];
  function extrema(value: Value) {
    if (typeof value === "number") frequencies.push(value);
    else if ("points" in value)
      value.points.forEach(([, point]) => extrema(point));
    else frequencies.push(...("range" in value ? value.range : value.random));
  }
  for (const { definition } of plan.layers) {
    if (definition.source.type === "oscillator")
      frequencies.push(...oscillatorFrequencyBounds(definition.source));
    else checkNoiseRate(sampleRate);
    definition.effects?.forEach(
      (effect) => effect.type === "filter" && extrema(effect.frequency),
    );
  }
  plan.recipe.effects?.forEach(
    (effect) => effect.type === "filter" && extrema(effect.frequency),
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
  const sources: (
    OscillatorNode | AudioBufferSourceNode | ConstantSourceNode
  )[] = [];
  const envelopes: {
    param: AudioParam;
    layer: PlannedLayer;
    source: AudioScheduledSourceNode;
  }[] = [];
  let clock: ConstantSourceNode | undefined;
  const reserved = at > context.currentTime;
  let finished = false;
  let releaseAt = Infinity;
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
    effects: readonly ResolvedEffect[] = [],
    definitions: readonly Effect[] = plan.recipe.effects ?? [],
  ): AudioNode {
    let output = input;
    for (const [index, effect] of effects.entries()) {
      if (effect.type === "delay") {
        if (effect.mix === 0) continue;
        // Native feedback circulation adds a render quantum. Split the requested
        // time between the loop and a feedforward quantum so the first echo AND
        // every repetition land at exact multiples of time (Chromium gate).
        const quantum = effect.feedback > 0 ? 128 / context.sampleRate : 0;
        const loopTime = effect.time - quantum;
        const delay = own(context.createDelay(loopTime));
        delay.delayTime.setValueAtTime(loopTime, at);
        delay.channelCount = 1;
        delay.channelCountMode = "explicit";
        const dry = own(context.createGain());
        const wet = own(context.createGain());
        const sum = own(context.createGain());
        dry.gain.value = 1 - effect.mix;
        wet.gain.value = effect.mix;
        output.connect(dry).connect(sum);
        output.connect(delay);
        let delayed: AudioNode = delay;
        if (quantum > 0) {
          const offset = own(context.createDelay(quantum));
          offset.delayTime.setValueAtTime(quantum, at);
          offset.channelCount = 1;
          offset.channelCountMode = "explicit";
          delay.connect(offset);
          delayed = offset;
        }
        delayed.connect(wet).connect(sum);
        if (effect.feedback > 0) {
          const feedback = own(context.createGain());
          feedback.gain.value = effect.feedback;
          delay.connect(feedback).connect(delay);
        }
        output = sum;
        continue;
      }
      const filter = own(context.createBiquadFilter());
      filter.type = effect.filter;
      schedule(
        filter.frequency,
        effect.frequency,
        (definitions[index] as Extract<Effect, { type: "filter" }>).frequency,
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
    const tailFade = plan.hasDelay ? 0.05 : 0.005;
    let outputFade = {
      at: at + plan.lifetime - tailFade,
      value: level,
      duration: tailFade,
    };
    output.gain.setValueAtTime(level, at);
    if (Number.isFinite(plan.lifetime)) {
      output.gain.setValueAtTime(level, at + plan.lifetime - tailFade);
      output.gain.linearRampToValueAtTime(0, at + plan.lifetime);
    }
    panner.pan.value = pan;
    filters(sum, plan.effectChain).connect(output);
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
        schedule(
          oscillator.detune,
          layer.source.detune,
          planned.definition.source.type === "oscillator"
            ? (planned.definition.source.detune ?? 0)
            : 0,
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
      envelopes.push({ param, layer: envelopePlan, source });
      // Preserve existing filter/envelope semantics. The first delay and every
      // following effect process the gated signal so tails survive release.
      const chain = layer.effects ?? [];
      const definitions = planned.definition.effects ?? [];
      const firstDelay = chain.findIndex(
        (effect) => effect.type === "delay" && effect.mix > 0,
      );
      const split = firstDelay < 0 ? chain.length : firstDelay;
      filters(
        source,
        chain.slice(0, split),
        definitions.slice(0, split),
      ).connect(envelope);
      let gated: AudioNode = envelope;
      if (dynamic) {
        const levelNode = own(context.createGain());
        schedule(levelNode.gain, layer.gainDb, planned.definition.gainDb, true);
        envelope.connect(levelNode);
        gated = levelNode;
      }
      filters(gated, chain.slice(split), definitions.slice(split)).connect(sum);
      if (!plan.hasDelay)
        source.onended = () => {
          if (++ended === sources.length) finish();
        };
    }
    // Audible sources stop at release so their ended events cannot discard
    // delay storage early. The silent clock owns the tail deadline. Chromium
    // only advances a ConstantSource, and fires onended, when the graph pulls
    // it, so it reaches the destination through a zero gain.
    if (plan.hasDelay) {
      clock = own(context.createConstantSource());
      sources.push(clock);
      clock.onended = finish;
      const silent = own(context.createGain());
      silent.gain.value = 0;
      clock.connect(silent);
      silent.connect(destination);
    }
    // Build the complete graph before scheduling any source.
    for (const source of sources) source.start(at);
    if (Number.isFinite(plan.lifetime)) {
      if (clock) {
        for (const { source, layer } of envelopes)
          source.stop(at + plan.duration + layer.layer.envelope.release);
        clock.stop(at + plan.lifetime);
      } else for (const source of sources) source.stop(at + plan.lifetime);
    }
    return {
      finish,
      get stopping() {
        return context.currentTime >= releaseAt;
      },
      set(controls) {
        if (finished || context.currentTime >= releaseAt)
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
          holdLinear(binding.param, now, current);
          binding.param.linearRampToValueAtTime(target, now + smoothing);
          Object.assign(binding, {
            start: now,
            end: now + smoothing,
            from: current,
            to: target,
          });
        }
      },
      stop(fade, requested) {
        if (finished) return;
        const now = Math.max(
          context.currentTime,
          requested ?? context.currentTime,
        );
        if (
          fade === undefined &&
          (context.currentTime >= releaseAt || now >= releaseAt)
        )
          return;
        if (
          now < at ||
          (now === at &&
            (reserved || (fade === undefined && requested !== undefined)))
        ) {
          finish();
          return;
        }
        // Natural one-shot automation is already scheduled. Never move its gate.
        releaseAt = Math.min(releaseAt, now, at + plan.duration);
        if (fade === undefined && now >= at + plan.duration) return;
        let end = now;
        for (const { param, layer, source } of envelopes) {
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
          const value =
            previous && now >= previous.at
              ? previous.value *
                Math.max(
                  0,
                  1 -
                    (now - previous.at) /
                      Math.max(previous.duration, Number.EPSILON),
                )
              : envelopeAt(layer, plan.duration, now - at);
          releases.set(param, { at: now, value, duration: release });
          holdLinear(param, now, value);
          param.linearRampToValueAtTime(0, now + release);
          if (clock) source.stop(now + release);
          const tail = plan.hasDelay
            ? Math.min(
                MAX_DELAY_TAIL,
                layer.tail + effectTail(plan.effectChain),
              ) + tailFade
            : 0;
          end = Math.max(end, now + release + tail);
        }
        end = Math.max(
          now,
          Math.min(stopEnd, end + (plan.hasDelay ? 0 : plan.filterTail)),
        );
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
        const fadeAt =
          plan.hasDelay && fade === undefined
            ? Math.max(now, end - tailFade)
            : now;
        outputFade = { at: fadeAt, value: outputValue, duration: end - fadeAt };
        holdLinear(output.gain, now, outputValue);
        if (fadeAt > now) output.gain.setValueAtTime(outputValue, fadeAt);
        output.gain.linearRampToValueAtTime(0, end);
        if (clock) clock.stop(end);
        else for (const source of sources) source.stop(end);
      },
    };
  } catch (error) {
    finish();
    throw error;
  }
}

/** Standalone Web Audio comparison for the three bundled dry sounds (MIT). */
export function playRaw(
  context: BaseAudioContext,
  kind: "confirmation" | "impact" | "thruster",
  control = kind === "impact" ? 0.5 : 0.2,
  seed = 42,
  at = context.currentTime,
) {
  if (
    !Number.isFinite(control) ||
    control < 0 ||
    control > 1 ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw new Error("Invalid control or seed.");
  const nodes: AudioNode[] = [];
  const sources: (OscillatorNode | AudioBufferSourceNode)[] = [];
  const envelopes: {
    param: AudioParam;
    peak: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  }[] = [];
  const bindings: {
    param: AudioParam;
    target(value: number): number;
    from: number;
    to: number;
    start: number;
    end: number;
  }[] = [];
  const own = <T extends AudioNode>(node: T) => {
    nodes.push(node);
    return node;
  };
  const db = (value: number) => 10 ** (value / 20);
  const gate =
    kind === "confirmation" ? 0.18 : kind === "impact" ? 0.22 : Infinity;
  const lifetime = gate + 0.05 + 0.05;
  let stopped = false;
  let disposed = false;
  let ended = 0;
  let resolveEnded!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveEnded = resolve;
  });
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const source of sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
      if ("buffer" in source) source.buffer = null;
    }
    nodes.forEach((node) => node.disconnect());
    nodes.length = sources.length = envelopes.length = bindings.length = 0;
    resolveEnded();
  }
  function random(initial: number) {
    let state = initial || 0x6d2b79f5;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0x100000000;
    };
  }
  function noise() {
    const rate = context.sampleRate;
    if (!Number.isInteger(rate) || rate < 8000 || rate > 192000)
      throw new Error("Unsupported noise sample rate.");
    const noiseSeed = Math.floor(random(seed)() * 0x100000000);
    const draw = random(noiseSeed);
    const buffer = context.createBuffer(1, rate, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < rate; i++) data[i] = draw() * 2 - 1;
    const seam = Math.round(rate * 0.02);
    for (let i = 0; i < seam; i++) {
      const mix = i / (seam - 1);
      const index = rate - seam + i;
      data[index] = data[index] * (1 - mix) + data[i] * mix;
    }
    const source = own(context.createBufferSource());
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = seam / rate;
    source.loopEnd = 1;
    sources.push(source);
    return source;
  }
  function oscillator(
    waveform: OscillatorType,
    frequency: number,
    endFrequency?: number,
    seconds?: number,
  ) {
    const source = own(context.createOscillator());
    source.type = waveform;
    source.frequency.setValueAtTime(frequency, at);
    if (endFrequency !== undefined && seconds !== undefined)
      source.frequency.exponentialRampToValueAtTime(endFrequency, at + seconds);
    sources.push(source);
    return source;
  }
  function filter(input: AudioNode, frequency: number) {
    const node = own(context.createBiquadFilter());
    node.type = "lowpass";
    node.Q.value = 0.7;
    node.frequency.setValueAtTime(frequency, at);
    input.connect(node);
    return node;
  }
  function bind(param: AudioParam, target: (value: number) => number) {
    const value = target(control);
    param.setValueAtTime(value, at);
    bindings.push({
      param,
      target,
      from: value,
      to: value,
      start: at,
      end: at,
    });
  }
  try {
    const sum = own(context.createGain());
    const output = own(context.createGain());
    const master = own(context.createGain());
    master.gain.value = db(-12);
    (kind === "confirmation" ? filter(sum, 3200) : sum).connect(output);
    const panner = own(context.createStereoPanner());
    panner.pan.value = 0;
    output.connect(panner);
    panner.connect(master);
    master.connect(context.destination);
    output.gain.setValueAtTime(1, at);
    if (Number.isFinite(lifetime)) {
      output.gain.setValueAtTime(1, at + lifetime - 0.005);
      output.gain.linearRampToValueAtTime(0, at + lifetime);
    }
    function layer(
      input: AudioNode,
      gainDb: number,
      attack: number,
      decay: number,
      sustain: number,
      release: number,
      dynamic?: (value: number) => number,
    ) {
      const envelope = own(context.createGain());
      const peak = dynamic ? 1 : db(gainDb);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(peak, at + attack);
      envelope.gain.linearRampToValueAtTime(
        peak * sustain,
        at + attack + decay,
      );
      if (Number.isFinite(gate)) {
        envelope.gain.setValueAtTime(peak * sustain, at + gate);
        envelope.gain.linearRampToValueAtTime(0, at + gate + release);
      }
      input.connect(envelope);
      if (dynamic) {
        const level = own(context.createGain());
        bind(level.gain, (value) => db(dynamic(value)));
        envelope.connect(level);
        level.connect(sum);
      } else envelope.connect(sum);
      envelopes.push({
        param: envelope.gain,
        peak,
        attack,
        decay,
        sustain,
        release,
      });
    }
    if (kind === "confirmation") {
      layer(oscillator("sine", 520, 660, 0.05), -14, 0.004, 0.12, 0.08, 0.04);
      layer(oscillator("sine", 1320), -26, 0.008, 0.1, 0.03, 0.05);
    } else if (kind === "impact") {
      // Intensity is play-only; a separate gain stage matches the managed graph.
      layer(
        oscillator("triangle", 100 + 120 * control, 48, 0.12),
        0,
        0.003,
        0.16,
        0.02,
        0.05,
        () => -22 + 10 * control,
      );
      layer(
        filter(noise(), 900 * (4200 / 900) ** control),
        -24,
        0.002,
        0.04,
        0,
        0.01,
      );
    } else {
      const motor = oscillator("triangle", 45 * (130 / 45) ** control);
      bind(motor.frequency, (value) => 45 * (130 / 45) ** value);
      layer(motor, 0, 0.08, 0.1, 0.8, 0.15, (value) => -30 + 12 * value);
      const exhaust = filter(noise(), 250 * (2400 / 250) ** control);
      bind(exhaust.frequency, (value) => 250 * (2400 / 250) ** value);
      layer(exhaust, 0, 0.1, 0.1, 0.9, 0.2, (value) => -34 + 12 * value);
    }
    for (const source of sources) {
      source.onended = () => {
        if (++ended === sources.length) dispose();
      };
      source.start(at);
      if (Number.isFinite(lifetime)) source.stop(at + lifetime);
    }
    return {
      ended: done,
      dispose,
      setThrottle(value: number) {
        if (
          kind !== "thruster" ||
          stopped ||
          disposed ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 1
        )
          throw new Error("Invalid live update.");
        const now = Math.max(at, context.currentTime);
        for (const binding of bindings) {
          const target = binding.target(value);
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
          binding.param.cancelAndHoldAtTime(now);
          binding.param.setValueAtTime(current, now);
          binding.param.linearRampToValueAtTime(target, now + 0.04);
          Object.assign(binding, {
            from: current,
            to: target,
            start: now,
            end: now + 0.04,
          });
        }
      },
      stop() {
        if (stopped || disposed) return;
        stopped = true;
        const now = context.currentTime;
        if (now < at) {
          dispose();
          return;
        }
        const elapsed = now - at;
        let end = now;
        for (const e of envelopes) {
          const value =
            elapsed < e.attack
              ? (e.peak * elapsed) / e.attack
              : elapsed < e.attack + e.decay
                ? e.peak *
                  (1 + ((e.sustain - 1) * (elapsed - e.attack)) / e.decay)
                : e.peak *
                  e.sustain *
                  (elapsed < gate
                    ? 1
                    : Math.max(0, 1 - (elapsed - gate) / e.release));
          const release = Math.max(
            0,
            Math.min(e.release, at + gate + e.release - now),
          );
          e.param.cancelAndHoldAtTime(now);
          e.param.setValueAtTime(value, now);
          e.param.linearRampToValueAtTime(0, now + release);
          end = Math.max(end, now + release);
        }
        end = Math.max(now, Math.min(at + lifetime, end + 0.05));
        const fadeAt = at + lifetime - 0.005;
        const outputValue =
          now <= fadeAt ? 1 : Math.max(0, (at + lifetime - now) / 0.005);
        output.gain.cancelAndHoldAtTime(now);
        output.gain.setValueAtTime(outputValue, now);
        output.gain.linearRampToValueAtTime(0, end);
        sources.forEach((source) => source.stop(end));
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}

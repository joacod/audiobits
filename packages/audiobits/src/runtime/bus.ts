import { holdLinear, linearValue } from "./automation";
import type { LinearRamp } from "./automation";
import { AudioBitsError } from "../recipe/validate";

/** @experimental Shared delay settings; not part of the stable 0.1 contract. */
export interface DelayOptions {
  readonly seconds: number;
  readonly feedback: number;
  readonly wet: number;
}
export interface Bus {
  readonly name: string;
  readonly parent: Bus | null;
  setParent(parent: Bus): void;
  setGainDb(value: number, rampSeconds?: number): void;
  setMuted(value: boolean): void;
  /** @experimental May change before 0.1; shared-effect composition is deferred. */
  setDelay(options: DelayOptions | null): void;
  dispose(): void;
}
function bounded(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new AudioBitsError(
      "invalid-option",
      `Value must be in [${min}, ${max}].`,
    );
  return value;
}
interface DelayGraph {
  readonly finished: boolean;
  input: GainNode;
  finish(): void;
  cut(): void;
  tail(inputTail: number): void;
  wake(): void;
}
export class OwnedBus implements Bus {
  readonly input: GainNode;
  readonly output: GainNode;
  parent: OwnedBus | null;
  disposed: boolean = false;
  private gainRamp: LinearRamp | undefined;
  private muteRamp: LinearRamp | undefined;
  private effect: DelayGraph | undefined;
  private retire: (() => void) | undefined;
  private settings: DelayOptions | null = null;
  constructor(
    readonly name: string,
    readonly context: AudioContext,
    readonly owner: object,
    parent: OwnedBus | null,
    private readonly remove: (bus: OwnedBus) => void,
    gainDb = 0,
    private readonly reroute: () => void = () => {},
  ) {
    this.parent = parent;
    this.input = context.createGain();
    let output: GainNode | undefined;
    try {
      output = context.createGain();
      this.output = output;
      this.input.gain.value = 10 ** (gainDb / 20);
      this.input.connect(this.output);
      this.output.connect(parent ? parent.input : context.destination);
    } catch (error) {
      this.input.disconnect();
      output?.disconnect();
      throw error;
    }
  }
  assert(): void {
    if (this.disposed || this.context.state === "closed")
      throw new AudioBitsError(
        "disposed",
        "Bus is disposed or its context is closed.",
      );
  }
  setParent(parent: Bus): void {
    this.assert();
    if (!this.parent)
      throw new AudioBitsError("invalid-route", "Master cannot be reparented.");
    if (!(parent instanceof OwnedBus) || parent.owner !== this.owner)
      throw new AudioBitsError(
        "invalid-route",
        "Parent must belong to this engine.",
      );
    parent.assert();
    for (let cursor: OwnedBus | null = parent; cursor; cursor = cursor.parent)
      if (cursor === this)
        throw new AudioBitsError("invalid-route", "Bus cycle rejected.");
    if (parent === this.parent) return;
    this.output.connect(parent.input);
    this.output.disconnect(this.parent.input);
    this.parent = parent;
    this.reroute();
  }
  setGainDb(value: number, rampSeconds = 0.005): void {
    this.assert();
    bounded(value, -60, 0);
    bounded(rampSeconds, 0, 10);
    const now = this.context.currentTime;
    const from = linearValue(this.gainRamp, now, this.input.gain.value);
    holdLinear(this.input.gain, now, from);
    this.gainRamp = {
      start: now,
      end: now + rampSeconds,
      from,
      to: 10 ** (value / 20),
    };
    this.input.gain.linearRampToValueAtTime(
      10 ** (value / 20),
      now + rampSeconds,
    );
  }
  setMuted(value: boolean): void {
    this.assert();
    if (typeof value !== "boolean")
      throw new AudioBitsError("invalid-option", "Mute must be boolean.");
    const now = this.context.currentTime;
    const from = linearValue(this.muteRamp, now, this.output.gain.value);
    holdLinear(this.output.gain, now, from);
    this.muteRamp = { start: now, end: now + 0.005, from, to: value ? 0 : 1 };
    this.output.gain.linearRampToValueAtTime(value ? 0 : 1, now + 0.005);
  }
  setDelay(options: DelayOptions | null): void {
    this.assert();
    if (options) {
      bounded(options.seconds, 0, 2);
      bounded(options.feedback, 0, 0.9);
      bounded(options.wet, 0, 1);
      if (options.seconds === 0 && options.feedback > 0)
        throw new AudioBitsError(
          "invalid-option",
          "Positive feedback requires positive delay.",
        );
    }
    // Build the replacement before disturbing the valid graph.
    const next = options ? this.buildDelay({ ...options }) : undefined;
    this.reset();
    this.settings = options ? { ...options } : null;
    this.effect = next;
    if (next) this.input.connect(next.input);
  }
  private buildDelay(options: DelayOptions): DelayGraph {
    const context = this.context;
    const nodes: AudioNode[] = [];
    const own = <T extends AudioNode>(node: T) => {
      nodes.push(node);
      return node;
    };
    let clock: OscillatorNode | undefined;
    let ended = false;
    let inlet: GainNode | undefined;
    const clearClock = () => {
      if (!clock) return;
      clock.onended = null;
      try {
        clock.stop();
      } catch {
        /* Already ended. */
      }
      clock.disconnect();
      clock = undefined;
    };
    const finish = () => {
      if (ended) return;
      ended = true;
      clearClock();
      if (inlet) {
        try {
          this.input.disconnect(inlet);
        } catch {
          /* Not connected or already detached. */
        }
        if (this.effect?.input === inlet) this.effect = undefined;
      }
      if (this.retire === finish) this.retire = undefined;
      nodes.forEach((node) => node.disconnect());
      nodes.length = 0;
    };
    try {
      const input = own(context.createGain());
      inlet = input;
      const delay = own(context.createDelay(2));
      const feedback = own(context.createGain());
      const wet = own(context.createGain());
      const gate = own(context.createGain());
      delay.delayTime.value = options.seconds;
      feedback.gain.value = options.feedback;
      wet.gain.value = options.wet;
      input.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(gate);
      gate.connect(this.output);
      let gateRamp: LinearRamp | undefined;
      const schedule = (seconds: number, destroy: boolean) => {
        clearClock();
        const now = context.currentTime;
        const from = linearValue(gateRamp, now, gate.gain.value);
        holdLinear(gate.gain, now, from);
        gateRamp = {
          start: now + Math.max(0, seconds - 0.005),
          end: now + seconds,
          from: seconds > 0.005 ? 1 : from,
          to: 0,
          before: from,
        };
        if (seconds > 0.005) gate.gain.setValueAtTime(1, now + seconds - 0.005);
        gate.gain.linearRampToValueAtTime(0, now + seconds);
        clock = context.createOscillator();
        clock.onended = () => {
          clearClock();
          if (destroy) finish();
        };
        clock.start();
        clock.stop(now + seconds);
      };
      return {
        input,
        finish,
        get finished() {
          return ended;
        },
        cut: () => {
          if (context.state !== "running") finish();
          else schedule(0.005, true);
        },
        tail: (inputTail) => {
          if (ended || clock) return;
          const repeats =
            options.feedback === 0
              ? 1
              : 1 + Math.ceil(Math.log(0.001) / Math.log(options.feedback));
          schedule(
            Math.min(5, Math.max(0.005, inputTail + options.seconds * repeats)),
            true,
          );
        },
        wake: () => {
          clearClock();
          const now = context.currentTime;
          const from = linearValue(gateRamp, now, gate.gain.value);
          holdLinear(gate.gain, now, from);
          gateRamp = { start: now, end: now + 0.005, from, to: 1 };
          gate.gain.linearRampToValueAtTime(1, now + 0.005);
        },
      };
    } catch (error) {
      finish();
      throw error;
    }
  }
  wake(): void {
    this.effect?.wake();
  }
  tail(inputTail = 0): void {
    this.effect?.tail(inputTail);
  }
  get tailSeconds(): number {
    const options = this.settings;
    if (!options || options.wet === 0) return 0;
    const repeats =
      options.feedback === 0
        ? 1
        : 1 + Math.ceil(Math.log(0.001) / Math.log(options.feedback));
    return Math.min(5, options.seconds * repeats);
  }
  reset(): void {
    this.retire?.();
    this.retire = undefined;
    if (this.effect) {
      const old = this.effect;
      this.input.disconnect(old.input);
      old.cut();
      this.retire = old.finish;
      this.effect = undefined;
    }
  }
  cut(): void {
    this.reset();
  }
  clear(): void {
    this.effect?.finish();
    this.retire?.();
    this.retire = undefined;
    this.effect = undefined;
    // Retain settings for recovery, rebuild only on fresh playback.
  }
  prepare(): void {
    if (this.effect?.finished) this.effect = undefined;
    if (!this.effect && this.settings) this.setDelay(this.settings);
    this.wake();
  }
  dispose(): void {
    if (this.disposed) return;
    this.assert();
    if (!this.parent)
      throw new AudioBitsError(
        "invalid-route",
        "Dispose the engine to dispose master.",
      );
    this.remove(this);
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    this.input.disconnect();
    this.output.disconnect();
  }
}

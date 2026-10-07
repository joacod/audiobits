import { holdLinear, linearValue } from "./automation";
import type { LinearRamp } from "./automation";
import { AudioBitsError } from "../recipe/validate";

export interface Bus {
  readonly name: string;
  readonly parent: Bus | null;
  setParent(parent: Bus): void;
  setGainDb(value: number, rampSeconds?: number): void;
  setMuted(value: boolean): void;
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
export class OwnedBus implements Bus {
  readonly input: GainNode;
  readonly output: GainNode;
  parent: OwnedBus | null;
  disposed: boolean = false;
  private gainRamp: LinearRamp | undefined;
  private muteRamp: LinearRamp | undefined;
  constructor(
    readonly name: string,
    readonly context: AudioContext,
    readonly owner: object,
    parent: OwnedBus | null,
    private readonly remove: (bus: OwnedBus) => void,
    gainDb = 0,
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
    this.input.disconnect();
    this.output.disconnect();
  }
}

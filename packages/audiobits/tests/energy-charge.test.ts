import { expect, it, vi } from "vitest";
import type { AudioEngine, Voice } from "../src/index";
import { defineSound, validateRecipe } from "../src/index";
import { compile } from "../src/compiler/plan";
import { energyCharge } from "../../../catalog/energy-charge/recipe";
import { createEnergyCharge } from "../../../catalog/energy-charge/progress";

it("serializes and validates all charge mappings across the range", () => {
  expect(JSON.parse(JSON.stringify(energyCharge))).toEqual(energyCharge);
  expect(validateRecipe(energyCharge).ok).toBe(true);
  const plans = [0, 0.25, 0.5, 0.75, 1].map((charge) =>
    compile(defineSound(energyCharge), { charge }, 42),
  );
  for (let i = 1; i < plans.length; i++) {
    for (let layer = 0; layer < 4; layer++)
      expect(plans[i].layers[layer].layer.gainDb).toBeGreaterThan(
        plans[i - 1].layers[layer].layer.gainDb as number,
      );
  }
  expect(plans[0].layers[0].layer.source).toMatchObject({ frequency: 80 });
  expect(plans[4].layers[0].layer.source).toMatchObject({ frequency: 320 });
  expect(plans[0].layers[1].layer.effects![0].frequency).toBe(240);
  expect(plans[4].layers[1].layer.effects![0].frequency).toBe(3600);
  expect(energyCharge.parameters.charge.smoothing).toBe(0.08);
  expect(() => compile(energyCharge, { charge: 1.1 })).toThrow();
  const invalid = structuredClone(JSON.parse(JSON.stringify(energyCharge)));
  invalid.layers[0].source.frequency.range = [80, -1];
  expect(validateRecipe(invalid).ok).toBe(false);
});

function setup() {
  let resolve!: () => void;
  const activation = new Promise<void>((done) => {
    resolve = done;
  });
  const voices: (Voice<typeof energyCharge> & { finish(): void })[] = [];
  const play = vi.fn(() => {
    let finish!: () => void;
    const voice = {
      state: "active",
      seed: 42,
      parameters: {},
      set: vi.fn(),
      stop: vi.fn(),
      ended: new Promise<void>((done) => {
        finish = done;
      }),
      finish,
    } as unknown as Voice<typeof energyCharge> & { finish(): void };
    voices.push(voice);
    return voice;
  });
  const dispose = vi.fn();
  const unsubscribe = vi.fn();
  const audio = {
    start: vi.fn(() => activation),
    sound: () => ({ play, dispose }),
    subscribe: () => unsubscribe,
  } as unknown as AudioEngine;
  const feedback = { state: vi.fn(), error: vi.fn() };
  return {
    control: createEnergyCharge(audio, feedback),
    resolve,
    voices,
    play,
    dispose,
    unsubscribe,
  };
}
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

it("updates the latest external progress on one voice and holds without timers", async () => {
  const s = setup();
  s.control.start(0);
  s.control.setCharge(0.4);
  s.resolve();
  await settle();
  expect(s.play).toHaveBeenCalledWith({
    seed: 42,
    parameters: { charge: 0.4 },
  });
  for (const charge of [0.8, 0.2, 0.2, 1]) s.control.setCharge(charge);
  expect(s.play).toHaveBeenCalledTimes(1);
  expect(s.voices[0].set).toHaveBeenLastCalledWith({ charge: 1 });
  expect(s.voices[0].stop).not.toHaveBeenCalled();
  for (const value of [-1, 1.1, NaN, Infinity])
    expect(() => s.control.setCharge(value)).toThrow(RangeError);
  s.control.release();
  expect(s.voices[0].stop).toHaveBeenCalledTimes(1);
  s.control.dispose();
});

it("cancellation invalidates activation, restart uses latest progress, old ends cannot stop new voices", async () => {
  const s = setup();
  s.control.start(0.3);
  s.control.cancel();
  s.resolve();
  await settle();
  expect(s.play).not.toHaveBeenCalled();
  s.control.start(0.7);
  await settle();
  s.control.release();
  s.control.start(1);
  await settle();
  s.voices[0].finish();
  await settle();
  expect(s.voices[1].stop).not.toHaveBeenCalled();
  s.control.dispose();
  s.control.dispose();
  expect(s.voices[1].stop).toHaveBeenCalledTimes(1);
  expect(s.dispose).toHaveBeenCalledTimes(1);
  expect(s.unsubscribe).toHaveBeenCalledTimes(1);
  s.control.start();
  expect(s.play).toHaveBeenCalledTimes(2);
});

for (const action of ["release", "dispose"] as const) {
  it(`cannot play after ${action} during activation`, async () => {
    const s = setup();
    s.control.start(1);
    s.control[action]();
    s.resolve();
    await settle();
    expect(s.play).not.toHaveBeenCalled();
    s.control.dispose();
  });
}

it("only the latest rapid pending restart creates a voice", async () => {
  const s = setup();
  for (let i = 0; i < 8; i++) {
    s.control.start(i / 10);
    s.control.cancel();
  }
  s.control.start(0.9);
  s.control.setCharge(0.6);
  s.resolve();
  await settle();
  expect(s.play).toHaveBeenCalledTimes(1);
  expect(s.play).toHaveBeenCalledWith({
    seed: 42,
    parameters: { charge: 0.6 },
  });
  s.control.dispose();
});

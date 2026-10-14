import { expect, it, vi } from "vitest";
import type { AudioEngine, Voice } from "../src/index";
import { defineSound, validateRecipe } from "../src/index";
import { compile } from "../src/compiler/plan";
import { energyCharge } from "../../../catalog/experiences/energy-charge/recipe";
import { createEnergyCharge } from "../../../catalog/experiences/energy-charge/progress";

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
    start: vi.fn(),
    sound: () => ({ play, dispose }),
    subscribe: () => unsubscribe,
  } as unknown as AudioEngine;
  const feedback = { state: vi.fn(), error: vi.fn() };
  return {
    control: createEnergyCharge(audio, feedback),
    audio,
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

it("uses external progress on one voice without activating the shared engine", () => {
  const s = setup();
  s.control.setCharge(0.4);
  s.control.start();
  s.control.start(0.9);
  expect(s.audio.start).not.toHaveBeenCalled();
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

it("restarts repeatedly, ignores old completion, and disposes only owned resources", async () => {
  const s = setup();
  for (let i = 0; i < 8; i++) {
    s.control.start(i / 10);
    s.control.stop();
  }
  s.control.start(1);
  s.voices[0].finish();
  await settle();
  expect(s.voices[8].stop).not.toHaveBeenCalled();
  s.control.dispose();
  s.control.dispose();
  expect(s.voices[8].stop).toHaveBeenCalledTimes(1);
  expect(s.dispose).toHaveBeenCalledTimes(1);
  expect(s.unsubscribe).toHaveBeenCalledTimes(1);
  s.control.start();
  expect(s.play).toHaveBeenCalledTimes(9);
});

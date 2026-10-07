import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import {
  tactileClick,
  gentleRejection,
  glassNotification,
  whoosh,
  powerUp,
} from "../../packages/audiobits/src/recipes";
import type { Recipe } from "../../packages/audiobits/src/recipe/generated";

test("new sounds render finite, bounded, repeatable output and clear their tails", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.addScriptTag({
    path: resolve(
      "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
    ),
  });
  const results = await page.evaluate(
    async (recipes) => {
      const render = (
        globalThis as unknown as {
          curatedSignal(
            recipe: Recipe,
            rate: number,
            values: Record<string, number>,
            count?: number,
            cancel?: boolean,
          ): Promise<{
            peak: number;
            energy: number;
            onset: number;
            tail: number;
            delta: number;
            finished: number;
          }>;
        }
      ).curatedSignal;
      const output = [];
      for (const recipe of recipes) {
        for (const rate of [44100, 48000]) {
          for (const edge of ["min", "default", "max"] as const) {
            const values = Object.fromEntries(
              Object.entries(recipe.parameters ?? {}).map(([key, p]) => [
                key,
                p[edge],
              ]),
            );
            const signal = await render(recipe, rate, values);
            if (edge === "default") {
              const replay = await render(recipe, rate, values);
              if (
                Math.abs(signal.energy - replay.energy) >
                signal.energy * 1e-5
              )
                throw new Error(
                  `Seeded replay energy drift: ${signal.energy} vs ${replay.energy}`,
                );
            }
            output.push({ ...signal, count: 1 });
          }
          const defaults = Object.fromEntries(
            Object.entries(recipe.parameters ?? {}).map(([key, p]) => [
              key,
              p.default,
            ]),
          );
          output.push({
            ...(await render(recipe, rate, defaults, 8)),
            count: 8,
          });
          const cancelled = await render(recipe, rate, defaults, 1, true);
          if (cancelled.energy !== 0 || cancelled.finished !== 1)
            throw new Error("Scheduled cancellation leaked");
        }
      }
      return output;
    },
    [tactileClick, gentleRejection, glassNotification, whoosh, powerUp],
  );
  for (const signal of results) {
    expect(signal.peak).toBeGreaterThan(0.001);
    expect(signal.peak).toBeLessThan(signal.count === 8 ? 1 : 0.5);
    expect(signal.energy).toBeGreaterThan(0);
    expect(signal.onset).toBe(0);
    expect(signal.tail).toBe(0);
    expect(signal.finished).toBe(signal.count);
    expect(signal.delta).toBeLessThan(signal.count === 8 ? 0.1 : 0.02);
  }
});

import { requireOfflineCheckpoints } from "./offline-capabilities";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const metadata = JSON.parse(
  readFileSync("packages/audiobits/src/recipe/capabilities.json", "utf8"),
);
for (const kind of metadata.recipe.kinds)
  test(`advertised ${kind} source, waveform and filter variants execute natively`, async ({
    page,
  }) => {
    await page.goto("http://127.0.0.1:4173");
    if (kind === "sustained") await requireOfflineCheckpoints(page);
    await page.addScriptTag({
      path: resolve(
        "node_modules/.cache/audiobits-audio-tests/audio-harness.iife.js",
      ),
    });
    let renders = 0;
    for (const source of metadata.recipe.sources) {
      for (const variant of source === "oscillator"
        ? metadata.recipe.waveforms
        : metadata.recipe.noiseColors) {
        for (const filter of metadata.recipe.filters) {
          const recipe = {
            schemaVersion: metadata.schemaVersion,
            kind,
            ...(kind === "one-shot" ? { duration: 0.3 } : {}),
            layers: [
              {
                id: "candidate",
                source:
                  source === "oscillator"
                    ? { type: source, waveform: variant, frequency: 440 }
                    : { type: source, color: variant },
                gainDb: -12,
                envelope: {
                  attack: 0.004,
                  decay: 0.1,
                  sustain: 0.2,
                  release: 0.05,
                },
              },
            ],
            effects: [{ type: "filter", filter, frequency: 1000, q: 0.7 }],
          };
          const result = await page.evaluate(
            (recipe) =>
              (
                globalThis as unknown as {
                  capabilitySignal(recipe: unknown): Promise<{
                    energy: number;
                    tail: number;
                    finished: number;
                  }>;
                }
              ).capabilitySignal(recipe),
            recipe,
          );
          expect(result.energy).toBeGreaterThan(0);
          expect(result.tail).toBe(0);
          expect(result.finished).toBe(1);
          renders++;
        }
      }
    }
    console.log(
      `Advertised primitive coverage: ${renders} native 48 kHz renders.`,
    );
  });

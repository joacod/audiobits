import { expect, test } from "vitest";
import * as recipes from "../src/recipes";
import { validateRecipe } from "../src/recipe/validate";
import { compile } from "../src/compiler/plan";
import { controlsFor } from "../src/compiler/values";
import capabilities from "../src/recipe/capabilities.json";

test("all curated recipes round-trip, validate and fit the existing schema at control extrema", () => {
  expect(Object.keys(recipes).sort()).toEqual(
    [...capabilities.curatedRecipes].sort(),
  );
  for (const recipe of Object.values(recipes)) {
    expect(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok).toBe(true);
    expect(Object.isFrozen(recipe)).toBe(true);
    for (const edge of ["min", "default", "max"] as const) {
      const values = Object.fromEntries(
        Object.entries(recipe.parameters ?? {}).map(([key, parameter]) => [
          key,
          parameter[edge],
        ]),
      );
      const controls = controlsFor(recipe, values);
      const first = compile(recipe, controls, 42);
      expect(compile(recipe, controls, 42)).toEqual(first);
      expect(first.layers.length).toBeLessThanOrEqual(4);
    }
  }
});

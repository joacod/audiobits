import { expect, test } from "vitest";
import { confirmation } from "../../../catalog/recipes/confirmation/recipe";
import { impact } from "../../../catalog/recipes/impact/recipe";
import { thruster } from "../../../catalog/recipes/thruster/recipe";
import { tactileClick } from "../../../catalog/recipes/tactile-click/recipe";
import { gentleRejection } from "../../../catalog/recipes/gentle-rejection/recipe";
import { glassNotification } from "../../../catalog/recipes/glass-notification/recipe";
import { whoosh } from "../../../catalog/recipes/whoosh/recipe";
import { powerUp } from "../../../catalog/recipes/power-up/recipe";
import { validateRecipe } from "../src/recipe/validate";
import { compile } from "../src/compiler/plan";
import { controlsFor } from "../src/compiler/values";

const recipes = {
  confirmation,
  impact,
  thruster,
  tactileClick,
  gentleRejection,
  glassNotification,
  whoosh,
  powerUp,
};

test("all curated recipes round-trip, validate and fit the existing schema at control extrema", () => {
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

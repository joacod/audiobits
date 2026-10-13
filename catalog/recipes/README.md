# Recipe source you own

The eight sound definitions in this directory are canonical creative source.
Each `recipe.ts` imports only public `audiobits` functions and types. Install
individual items through the [source registry](../README.md), or copy a file
and retain the repository's MIT license. No catalog package is required.

The source preserves the existing sound data, controls, timing and variation.
Create a sound with `audio.sound(recipe)`, activate the engine from a user
gesture, then play with parameters and a seed. Thruster has a live throttle
control; update the active voice with `voice.set({ throttle })` and release
with `voice.stop()`. Dispose the engine when removing its host. See the
[recipe documentation](../../apps/www/content/docs/%28runtime%29/recipes.mdx).

Edit acoustic definitions here. The npm package contains only the engine and
recipe language; it does not generate or export creative recipe definitions.
`pnpm test` verifies recipe round trips and deterministic seeded execution plans
at control minima, defaults and maxima.

`registry.json` at the repository root records stable item IDs, export names,
discovery metadata, required capabilities and complete file/license manifests.
Keep metadata and manifests accurate when editing source. `pnpm test:package`
copies all ten registry items into separate installed source trees, typechecks
every TypeScript file against the packed public runtime, validates the recipes,
and exercises both complete experiences in Chromium.

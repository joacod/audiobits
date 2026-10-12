---
"audiobits": minor
---

Breaking pre-1.0 migration to the engine-only package: remove `audiobits/recipes`,
the bundled creative recipe build and npm-shipped `skill/` directory. Capabilities
now describe only runtime and recipe-language support, without `curatedRecipes`.
The minor Changeset targets the next pre-1.0 line (0.2.x from 0.1.x); it does not
signal 1.0 readiness.

Copy or install the required recipe from the repository's `catalog/recipes/`,
retain its MIT license and replace the former bundled import with its local
`recipe.ts` path. Recipe export names, data, controls and schema version 1 are
unchanged. Install agent instructions separately from `skills/audiobits/` if
needed. See the [migration guide](https://audiobits.joacod.com/docs/recipes#migrating-from-bundled-recipes).

`createAudio`, `defineSound`, `validateRecipe`, recipe types, `schema.json`,
`capabilities.json`, playback and lifecycle contracts are preserved. The runtime
remains framework-independent with zero runtime dependencies.

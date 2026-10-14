# Discover and adapt owned source

The GitHub source registry distributes editable source, independently of the
runtime package. It is available without a monorepo checkout or MCP. From the
consumer's project, inspect available items and the relevant payload:

```sh
npx shadcn@4.21.4 list joacod/audiobits
npx shadcn@4.21.4 view joacod/audiobits/reactive-thruster
npx shadcn@4.21.4 add joacod/audiobits/reactive-thruster
```

Use the [public registry guide](https://github.com/joacod/audiobits/blob/main/catalog/README.md)
and `registry.json` from the same reviewed repository ref for discovery,
capability requirements and file manifests. Append `#<reviewed-full-commit-SHA>`
to registry addresses for reproducible installs. Compare item requirements with
the installed runtime metadata before adding source; do not upgrade the runtime
as a side effect. If needed, inspect source at that ref and copy only the
relevant files, preserving relative imports.

The pinned CLI's normal `add` supports these universal entries without React,
Tailwind or `components.json`. Its `add --dry-run`, `--diff` and `--view` modes
can enter component setup in an unconfigured application. Use the top-level
`view` command or the guide's disposable preview directory instead; decline
unrelated framework setup. Review existing-file conflicts and preserve local
changes. Do not use `--overwrite` casually.

Recipes install at `src/sounds/recipes/<id>/`; experiences at
`src/sounds/experiences/<id>/`. Import copied files from the consumer's source
tree, never from `../../catalog/` or unpublished package internals. The registry
may evolve independently of an older installed runtime.

Recipe items install only `recipe.ts`; sustained Thruster can use `voice.set()`
directly. Experience items install acoustic definitions, a sound controller and
a README with a tested `src/integration.ts` example:

| Item              | Controller                                 | Existing application input                                                                |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Energy Charge     | `progress.ts`: `createEnergyCharge(audio)` | `start(progress)`, `setCharge(progress)`, `release()`                                     |
| Reactive Thruster | `pointer.ts`: `createThruster(audio)`      | `start(throttle)`, `setThrottle(throttle)`                                                |
| Lightsaber        | `controller.ts`: `createLightsaber(audio)` | `ignite()`, `update(movement, elapsedMs, direction)`, `clash(strength, pan)`, `retract()` |

Progress, throttle, movement and strike strength use finite `[0, 1]` inputs;
direction uses `[-1, 1]`. Despite its filename, `pointer.ts` contains no pointer
handlers. The application activates its engine before starting a controller,
then owns input mapping, suspension and engine disposal. Controllers dispose
only their own sound resources. Demo hosts, HTML, renderers, motion geometry and
Reactive Thruster's separate Impact action remain in the repository.

Use [integration](integration.md) for a one-shot host and
[interactions](interactions.md) for sustained and Lightsaber integrations.
Keep the application's entrypoint, events and lifecycle.

## One-shot consumer example

Install `confirmation` and use this code in `src/integration.ts`. Bind `play()`
directly to the existing Save or Confirm click and report rejected activation
promises. Bind Stop to cancellation; the engine owner handles hiding and teardown
as described in [integration](integration.md).

```ts
import { createAudio } from "audiobits";
import { confirmation } from "./sounds/recipes/confirmation/recipe";

const audio = createAudio();
const sound = audio.sound(confirmation);
let request = 0;

// Bind directly to a button click; surface a failed start and allow retry.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  sound.play({ parameters: {}, seed: 42 });
}

export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}

// Call when removing this integration.
export async function dispose() {
  stop();
  await audio.dispose();
}
```

You own installed source. Catalog source uses 0BSD with no required license
notices or credit. Review later catalog updates as source changes and validate
adapted recipes/controllers against the consumer's runtime. After installation, typechecking, builds and
playback need only local source and `audiobits`, with no registry access.

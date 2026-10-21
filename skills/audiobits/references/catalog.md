# Discover and adapt owned source

The GitHub source registry distributes editable source, independently of the
runtime package. It is available without a monorepo checkout or MCP. From the
consumer's project, inspect available items and the relevant payload:

```sh
npx shadcn@latest list joacod/audiobits
npx shadcn@latest view joacod/audiobits/reactive-thruster
npx shadcn@latest add joacod/audiobits/reactive-thruster
```

Use the [public registry guide](https://github.com/joacod/audiobits/blob/main/catalog/README.md)
and `registry.json` from the same reviewed repository ref for discovery,
capability requirements and file manifests. Append `#<reviewed-full-commit-SHA>`
to registry addresses for reproducible installs. Compare item requirements with
the installed runtime metadata before adding source; do not upgrade the runtime
as a side effect. If needed, inspect source at that ref and copy only the
relevant files, preserving relative imports.

Normal `add` supports these universal entries without React, Tailwind or
`components.json`. In an unconfigured application, `add --dry-run`, `--diff`
and `--view` can request component setup. Use top-level `view` instead and
decline unrelated setup. Review existing-file conflicts and preserve local
changes. Do not use `--overwrite` casually.

Recipes install at `src/sounds/recipes/<id>/`; experiences at
`src/sounds/experiences/<id>/`. Import copied files from the consumer's source
tree, never from `../../catalog/` or unpublished package internals. The registry
may evolve independently of an older installed runtime.

Recipe items install only `recipe.ts`; sustained Thruster can use `voice.set()`
directly. Experience items install acoustic definitions, a sound controller and
a README with a tested `src/integration.ts` example.

Echo Probe's `createEchoProbe(audio)` takes bounded reflection data through
`emit(reflections, { seed, strength })`. Each reflection supplies relative distance,
stereo pan, intensity, and surface character. The controller schedules emission,
pulse-preserving returns, and a sparse late cluster on the audio clock. Material
and propagation filters are independent; reflection intensity and stereo direction
retain separate roles. At 120 ms intervals it favors new pulses and early energy
over older late tails, with two foreground groups and one releasing group.
Its installed guide covers
voice budgets, cancellation, and scheduled times for application feedback.

The Rift's `createRift(audio)` opens a persistent field with `open()`, keeps it
with `settle()` or heals it with `cancel()`, and takes normalized aperture,
tension and instability through `update()`. Without input, the controller
evolves the field and schedules bounded disturbances on the audio clock.
`collapse()` is a deliberate finale that returns to `idle`; `nextPhase` is the
complete transition table, observable through `rift.phase` and `onPhase()`.

Riff Reactor's `createRiff(audio, song)` plays the band of a `RiffSong` from
`start()`, which returns the audio-clock transport (`beatAt`, `timeAt`). It
schedules band events in 150 ms lookahead batches and never plays the lead on
its own: `performLead(index)` plays a charted note immediately until its end,
monophonically, and `choke()` marks a stray input. `setIntensity(0 | 1 | 2)`
lands on the next unscheduled bar line. Judge input against
`beatAt(context.currentTime - riff.latency)`; scoring and charts stay in the
application.

The installed guide defines each controller's bounded inputs and lifecycle.
Activate the application-owned engine before starting a controller, then own
input mapping, suspension and engine disposal. Controllers dispose only their
own sound resources. Demo hosts, HTML, renderers and motion geometry remain in
the repository.

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

# AudioBits

Browser-native procedural sound for games and interactive applications. Build
and vary sounds from editable JSON recipes, with no downloaded audio assets and
zero runtime dependencies.

**Private, unreleased 0.1.0-rc.0 candidate.** Eight bundled sounds: confirmation,
impact, thruster, tactile click, gentle rejection, glass notification, whoosh and
power-up. npm publication and site deployment are not enabled.

## Try the gallery

Use Node 24.21.0 and pnpm 12.9.1, as pinned in this repository:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [the local gallery](http://127.0.0.1:3000/sounds). Press Play, change the
controls or seed, edit a recipe, and copy its code. Audio starts only from a user
gesture. The site includes the development API documentation.

## Use the library

For a separate browser application, build and verify a local candidate with
`pnpm test:package`, then install its archive from
`node_modules/.cache/audiobits-release/` using `npm install <archive-path>`.
The package is not available from a confirmed npm release.

```ts
import { createAudio } from "audiobits";
import { confirmation } from "audiobits/recipes";

const audio = createAudio();
const sound = audio.sound(confirmation);
export async function play() {
  await audio.start();
  sound.play();
}
export function stop() {
  audio.stopAll({ tails: "cut" });
}
export async function dispose() {
  await audio.dispose();
}
```

Bind `play()` to a click handler and surface rejected activation, for example
`void play().catch(showError)`. Stop cuts voices and effect tails; dispose when
the host is removed. Use the [production lifecycle example](packages/audiobits/README.md#production-lifecycle)
to handle pending activation, hiding and navigation.

The [package reference](packages/audiobits/README.md) covers recipe validation,
live controls, buses and caller-owned native output taps. Shared effects are
deferred. [Development](docs/development.md) explains local package edits
and checks; [architecture](docs/architecture.md) describes ownership and limits.

## Verification and release status

Automated checks target Chromium, Firefox and Playwright WebKit; the packed
consumer rehearsal uses Chromium. This is engine automation, not physical
Safari/iOS or mobile-device evidence. The maintainer reported listening
acceptance for all eight sounds on 2026-10-07; devices and detailed coverage
were not specified. [Release preparation](docs/releases.md) records the remaining gates
and the separate publication/deployment approvals.

## License

[MIT](LICENSE).

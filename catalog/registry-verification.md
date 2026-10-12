# GitHub registry proof of concept

Verified on 2026-10-12 from the pushed `feat/github-source-registry` branch,
starting from PR 01's merged catalog layout (#56). This is a verification record,
not a release gate or hosted-CI claim.

## Registry commands

The actual CLI was shadcn 4.21.4. These GitHub commands passed:

```sh
npm exec --yes --package=shadcn@4.21.4 -- shadcn registry validate 'joacod/audiobits#feat/github-source-registry'
npm exec --yes --package=shadcn@4.21.4 -- shadcn list 'joacod/audiobits#feat/github-source-registry'
npm exec --yes --package=shadcn@4.21.4 -- shadcn view 'joacod/audiobits/confirmation#feat/github-source-registry'
npm exec --yes --package=shadcn@4.21.4 -- shadcn view 'joacod/audiobits/energy-charge#feat/github-source-registry'
```

Validation checked one registry file and exactly two items. Payload inspection
confirmed `audiobits` as the only declared dependency, explicit owned targets,
metadata, license files and the complete Energy Charge source/demo set.

The following commands passed with `-c` pointing at each item's independent
external consumer directory:

```sh
npm exec --yes --package=shadcn@4.21.4 -- shadcn add 'joacod/audiobits/confirmation#feat/github-source-registry' -y
npm exec --yes --package=shadcn@4.21.4 -- shadcn add 'joacod/audiobits/energy-charge#feat/github-source-registry' -y
```

Installation needed no `components.json`, React, Tailwind or Next.js. Both
consumers began with an existing HTML entrypoint and configuration. File hashes
confirmed those application files were unchanged. Energy Charge's six installed
files matched their repository sources byte for byte; Confirmation's final
source also matched. Its import uses the exported `Recipe` type rather than the
package-internal `OneShotRecipe` type.

## Preview and conflict checks

Without `components.json`, `add --dry-run` prompted for framework initialization.
The [documented disposable review configuration](README.md#preview-limitation-in-shadcn-4214)
allowed these commands to pass with `-c` pointing at each review copy:

```sh
npm exec --yes --package=shadcn@4.21.4 -- shadcn add 'joacod/audiobits/confirmation#feat/github-source-registry' --dry-run
npm exec --yes --package=shadcn@4.21.4 -- shadcn add 'joacod/audiobits/confirmation#feat/github-source-registry' --diff
npm exec --yes --package=shadcn@4.21.4 -- shadcn add 'joacod/audiobits/energy-charge#feat/github-source-registry' --dry-run
npm exec --yes --package=shadcn@4.21.4 -- shadcn add 'joacod/audiobits/energy-charge#feat/github-source-registry' --diff
```

Each copy contained a customized recipe. Preview reported one overwrite and
skipped identical files; diff exposed the source changes. Running the ordinary
`add ... -y` commands again prompted before overwriting, even with `-y`.
Answering `n` preserved each customized file byte for byte. The prompt names the
source basename `recipe.ts`; the output and preview identify its installed target.
No custom installer or consumer configuration change was needed for installation.

## External consumer results

The runtime archive was built and packed from `packages/audiobits/package.json`
(version 0.1.5 for this record), then installed offline with scripts disabled in
two clean projects outside the workspace. Each project retained the archive
`file:` dependency after registry installation. Vite 8.3.2 and TypeScript 6.0.3
were added only as development tools. Verification used Node 24.21.0 and pnpm
12.9.1 with `NODE_ENV` unset.

| Check                                              | Confirmation                                | Energy Charge                                |
| -------------------------------------------------- | ------------------------------------------- | -------------------------------------------- |
| Strict TypeScript, ESNext/Bundler, ES2022, no emit | Passed                                      | Passed                                       |
| Independent Vite production build                  | Passed                                      | Passed, nested demo entrypoint               |
| Public runtime APIs only                           | Passed                                      | Passed                                       |
| Recipe/source completeness                         | Equal to bundled recipe data                | All relative imports and six files present   |
| Chromium signal                                    | Finite, nonzero peak 0.0441                 | Finite, nonzero peak 0.0162                  |
| Browser interaction                                | Gesture activation, finite voice completion | Progress 1, 0.3, 0.8; mute, release and Stop |
| Cleanup                                            | Engine context closed                       | Pagehide context closed                      |
| Registry independence                              | Zero remote browser requests                | Zero remote browser requests                 |
| Runtime dependencies                               | Only packed `audiobits`                     | Only packed `audiobits`                      |
| Application entrypoint/configuration               | Hashes unchanged                            | Hashes unchanged                             |

The browser proof used Chromium 153.0.8010.12 and Playwright 1.63.0. Confirmation
ran through a consumer-owned test page; Energy Charge ran its installed demo.
The browser allowed only the local consumer server and rejected remote requests.
Builds and playback resolved local installed source and the packed runtime,
without monorepo source aliases or a registry connection. Compiler and Vite
executables came from each external project's own development dependencies.
The packed runtime retained zero runtime dependencies and the existing
`audiobits/recipes` export. No package behavior or exports changed.

Focused repository checks passed: `pnpm build:lib`, `pnpm lint`, and
`git diff --check`. No npm Changeset is needed for registry/catalog-only delivery.

These checks establish source portability and the observed signal/lifecycle
behavior. They do not establish listening quality, physical-device support,
other browsers or hosted CI. Source is TypeScript requiring a consumer build
tool; the nested HTML demo is optional. shadcn 4.21.4's preview preflight remains
the upstream limitation described above.

# Contributing to AudioBits

Thanks for helping make procedural sound useful on the web. Bug reports, sound
ideas, documentation fixes, and focused code changes are welcome.

## Get started

Fork and clone the repository, then select the Node version in
[.node-version](.node-version) and the pnpm version in [package.json](package.json).
From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The website runs at <http://127.0.0.1:3000>. See
[local development](docs/development.md) for commands and troubleshooting.

## Where to contribute

- **Runtime: [packages/audiobits/](packages/audiobits/).** The engine, public APIs,
  schema, and sound primitives. Favor stability and demonstrate a concrete sound
  or application use case before adding functionality. Try composition first.
- **Catalog: [catalog/](catalog/).** Portable recipes and sound controllers.
  [registry.json](registry.json) is the canonical source registry and installation
  contract; presentation stays separate. New entries need verified consumer
  examples using their actual installed imports.
- **Website and docs: [apps/www/](apps/www/).** Discovery, immersive showcases,
  adoption UX, and Fumadocs documentation.

See [architecture and ownership](docs/architecture.md#repository-boundaries) for
the boundaries between these areas.

## Propose or improve a sound

Open an [idea issue](https://github.com/joacod/audiobits/issues/new?template=idea.md)
with the sound's intended use, desired character, and interaction, or send a
focused PR improving an existing recipe. Include the parameters and seed needed
to reproduce your example when applicable.

Distribute sound behavior first: recipes describe sound, and simple sounds need
no controller. Complex sounds can use small controllers driven by bounded,
normalized application inputs and events. Keep pointer handling, canvas, 3D,
and other presentation out of installed sound source. New catalog entries need
consumer examples checked against the packed runtime, including gesture
activation, Stop, and disposal. Follow
[catalog development and checks](docs/development.md#catalog-examples) for registry
updates, consumer verification, and related documentation and metadata.

## Verify and open a PR

Install the optional fast staged-file hook once with `pnpm hooks:install`.
Before a code PR, run `pnpm verify:local` and the smallest additional checks
relevant to your change. Documentation-only changes can use focused static checks:

- Runtime or recipe changes: focused unit tests with `pnpm exec vitest run <test-file>`
  and affected Chromium checks.
- Catalog entries or installed examples: `pnpm test:package`.
- Website behavior: typechecking, a site build, and affected Chromium tests.

Use [verification by task](docs/development.md#verification-by-task) for commands
and [validation guidance](docs/validation.md) for evidence expectations.
Chromium is the automated browser target. Routine CI uses
`pnpm test:browser:smoke`; `pnpm test:browser:full` retains extended regression
coverage for explicit verification and releases. Follow the authoritative
[test selection policy](docs/validation.md#test-selection); new code does not
by itself require additional tests. Hooks do not replace focused checks.

Keep each PR focused on one problem or use case. Describe what changed, why it
helps, and which checks you ran. Include a Changeset with `pnpm changeset` for
user-visible published-package changes; website-only and contributor-doc changes
do not need one.

Report listening observations separately from automated results. Describe what
you heard, the recipe/settings, and your browser and listening setup. Signal and
lifecycle tests verify technical behavior; they do not establish that a sound
has the intended character or quality.

## Licensing

The runtime and repository default use the [MIT license](LICENSE).
Copy-owned catalog source uses [0BSD](catalog/LICENSE). Keep contributions within
these existing boundaries and identify any third-party material and its license.

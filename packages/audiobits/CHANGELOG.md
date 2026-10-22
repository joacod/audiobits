# audiobits

## 0.3.6

### Patch Changes

- 3a391b9: Add author and issue tracker metadata and normalize the repository URL.

## 0.3.5

### Patch Changes

- 7cb3480: Remove the silent buffer source from audio activation. Starting an engine now
  creates its output and resumes its context without scheduling a source.
  Browser activation remains the application's responsibility. Pending-start
  retries, cancellation, the activation deadline and disposal remain supported.

## 0.3.4

### Patch Changes

- c2d8186: Start the silent activation source before resuming suspended output and preserve it when concurrent gesture handlers join startup, so the initial held interaction can activate audio without cutting its first frame.

## 0.3.3

### Patch Changes

- 855900a: Prime suspended audio output with a silent frame during activation so held interactions can start from the initial touch.

## 0.3.2

### Patch Changes

- 98ad2c1: Allow a later user gesture to retry native audio activation while an earlier start is still pending, preserving shared startup and cancellation behavior.

## 0.3.1

### Patch Changes

- 0440094: Clarify the npm README for coding agents (Skill with optional MCP) and trim the catalog section to point at the catalog docs.

## 0.3.0

### Minor Changes

- f5abd7f: Add native recipe delay at layer and recipe scope, with bounded feedback, linear dry/wet mixing, seeded variation and play-time mappings. Preserve echo tails through normal release, bound their lifetime, and clean up the complete graph on explicit cuts, suspension and disposal. Export Delay and Effect types and advertise the additive schema-1 capability.

## 0.2.4

### Patch Changes

- a9a1802: Document the shadcn command for installing catalog items in the package README.

## 0.2.3

### Patch Changes

- 11e9cab: Correct the package README to reflect the catalog's 0BSD license, which requires no retained notices or credit. The runtime remains MIT-licensed.

## 0.2.2

### Patch Changes

- 8ecc08b: Update the package description and npm keywords, and link the MCP docs from the README.

## 0.2.1

### Patch Changes

- 13d510b: Update package homepage and documentation links to the canonical AudioBits domain and simplify browser verification wording in the npm README.

## 0.2.0

### Minor Changes

- f9fe119: Make the npm package engine-only: ship the runtime, recipe language, types,
  schema and capabilities. Remove bundled creative recipes and agent instructions
  from the package. Recipes, interactive experiences and agent guidance live
  separately as repository source. Capabilities describe the runtime and recipe
  language.

## 0.1.5

### Patch Changes

- d341fd9: Align the npm README with AudioBits' current product positioning, reactive sound capabilities, and interactive catalog examples.

## 0.1.4

### Patch Changes

- 5340645: Simplify the package README to a tested quick start and direct detailed guidance to the website docs. Clarify installed-version authority in the shipped integration Skill.

## 0.1.3

### Patch Changes

- 7aa39bd: Align the package README with published capabilities and add the public website
  and relevant npm keywords to package metadata. Runtime behavior is unchanged.

## 0.1.2

### Patch Changes

- 7f792f9: Clarify npm installation and the minimal confirmation-sound quick start in the shipped README and Skill, with nearby browser gesture and lifecycle guidance.

## 0.1.1

### Patch Changes

- Correct stale unpublished-package wording and document registry installation with `npm install audiobits`. Runtime behavior is unchanged.

## 0.1.0

### Minor Changes

- faf1c04: Preserve recipe parameter names and live modes in TypeScript authoring, and add
  five procedural presets: tactileClick, gentleRejection, glassNotification,
  whoosh and powerUp. Mark shared delay experimental and simplify the quick start
  while retaining explicit production lifecycle guidance.
- 7db5e9f: Prepare the first three-sound core candidate: schema-1 oscillator/white-noise
  recipes, seeded variation, play/live controls, bounded voices, buses and shared
  delay, explicit caller-owned native interop, and gesture-driven lifecycle APIs.
  Chromium is the initial browser gate. No registry release or deployment is implied.

### Patch Changes

- faf1c04: Preserve managed linear ramps, live retargeting and release fades when the browser
  lacks AudioParam.cancelAndHoldAtTime. Track bus gain, mute and delay gates explicitly.

## 0.1.0-rc.0

### Minor Changes

- Prepare the first three-sound core candidate: schema-1 oscillator/white-noise
  recipes, seeded variation, play/live controls, bounded voices, buses and shared
  delay, explicit caller-owned native interop, and gesture-driven lifecycle APIs.
  Chromium is the initial browser gate. No registry release or deployment is implied.

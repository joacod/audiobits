# audiobits

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

# Tasks

Prerequisite: Step 01 accepted; local builds and package consumption work.
Step 02 was selected and implemented. Automated evidence and maintainer manual
verification are recorded in [verification.md](verification.md).
Stop at this change's review boundary; do not start Step 03.

## 1. Recipe contract

- [x] 1.1 Implement the finite descriptor, generated types/JSON Schema, and semantic validator; verify valid fixtures plus unknown versions/fields, cycles, budgets, and stable issue paths.
- [x] 1.2 Implement immutable snapshots and normalized plans; verify caller mutation, deterministic normalization, and no browser-global access in pure tests.
- [x] 1.3 Document the supported schema subset and error contract; typecheck the examples and reject all deferred forms in fixtures.

## 2. Engine and voices

- [x] 2.1 Implement lazy start/state/dispose with cancellation and shared pending starts; verify pure race tests and Chromium gesture/retry behavior.
- [x] 2.2 Implement finite oscillator/filter graphs, envelopes, context-time scheduling, stop, and cleanup; verify overlap, cancellation before onset, release from current value, and offline duration/energy.
- [x] 2.3 Implement voice bounds and bounded oldest-voice retirement; verify rapid repeated-play stress and counts returning to baseline.
- [x] 2.4 Add package-public playback examples with cleanup; verify them from the built package in the vanilla consumer and site.

## 3. First sound and gate

- [x] 3.1 Implement and tune the confirmation fixture plus minimal Play/mute/Stop/error UI; verify Chromium interaction, route teardown, and SSR import behavior.
- [x] 3.2 Measure finite output, default peaks, and eight-voice overlap; obtain and record listening review separately from automated signal checks.
- [x] 3.3 Run the applicable package/site/core checks and public-content review; record commands, browser version, limitations, and Step 02 gate outcome in verification.md.

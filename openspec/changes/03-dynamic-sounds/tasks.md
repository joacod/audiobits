# Tasks

Prerequisite: Step 02 accepted, including working finite playback and resource
ownership. Step 03 was selected, implemented, and manually verified by the
maintainer. Automated evidence and listening acceptance are recorded in
[verification.md](verification.md).
Stop at this change's review boundary and do not start Step 04.

## 1. Value and noise primitives

- [x] 1.1 Extend types/schema/semantic validation for controls, variation, noise, and sustained recipes; verify parameter extrema, invalid updates, and generated-artifact drift.
- [x] 1.2 Implement the documented PRNG/seed mapping and deterministic traversal; verify known vectors and reproducible variation/noise fixtures at 44.1 and 48 kHz.
- [x] 1.3 Implement bounded noise allocation and seam treatment; verify memory/resource counts and record the chosen buffer/cache bounds.

## 2. Dynamic runtime

- [x] 2.1 Implement live mappings with smoothing and atomic updates; verify rapid retargeting, play-only errors, ended-voice errors, and no voice recreation.
- [x] 2.2 Implement sustained envelope release using existing voice limits/cleanup; verify start/stop stress, disposal, and no growth over repeated control updates.
- [x] 2.3 Update public API/control documentation and examples; typecheck and run them through the packed package.

## 3. Core experiences and gate

- [x] 3.1 Implement impact and thruster recipes and usable controls; verify Chromium interaction, repeated triggers, throttle changes, and Stop behavior.
- [x] 3.2 Record offline signal checks and listening review for all three sounds, including noise seams and parameter extrema; fix issues before marking the core gate passed.
- [x] 3.3 Measure package size, preparation/scheduling cost, and owned resources; record the baseline and any justified budgets in verification.md.
- [x] 3.4 Run applicable package/site checks and public-content review; record first-core readiness without publishing or claiming other-browser support.

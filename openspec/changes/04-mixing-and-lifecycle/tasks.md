# Tasks

Prerequisite: Step 03 core accepted. All tasks below are unimplemented. Work on this change
only when selected; stop after its acceptance review. Command names must match
the actual package scripts created in Step 01.

## 1. Routing and effects

- [ ] 1.1 Implement named single-parent buses with atomic route validation and subtree disposal; verify cycles, foreign contexts, duplicate routes, and teardown.
- [ ] 1.2 Implement independent mute/gain stages and bounded shared delay; verify parameter validation, mute during automation, tail cap, and cut/reset behavior.
- [ ] 1.3 Document bus ownership, Stop all tail options, and master disposal; verify public examples compile and run in Chromium.

## 2. Native and page lifecycle

- [ ] 2.1 Add the narrow native/analyser integration and explicit caller cleanup example; verify foreign-context rejection and no doubled destination connection.
- [ ] 2.2 Implement site hide/unmount/start invalidation with cut tails and fresh-gesture recovery; verify races in unit tests and visible behavior in Chromium.
- [ ] 2.3 Exercise supported suspended/closed/interrupted transitions; record which were native, simulated, or manual and keep browser support claims unchanged.

## 3. Integration gate

- [ ] 3.1 Run combined sustained/finite/bus stress and cleanup scenarios plus package/site checks; record resource baselines and command results in verification.md.
- [ ] 3.2 Obtain listening feedback for mute, fades, delay tails, and stop behavior; review public docs and any release Changeset without publishing.

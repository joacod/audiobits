# Tasks

Prerequisite: Step 04 accepted for the full gallery; an early core release can use the smaller Step 02–03 demo. Implementation and automated checks are complete; the maintainer confirmed gallery manual acceptance on 2026-10-06. Work on this change
only when selected; stop after its acceptance review. Command names must match
the actual package scripts created in Step 01.

## 1. Gallery and controls

- [x] 1.1 Implement gallery routes and core sound cards with shared theme/navigation; verify explicit Play, error recovery, reset, and sustained Stop in Chromium.
- [x] 1.2 Add keyboard/touch labels, focus, mute/volume, silent browsing, and reduced motion; verify keyboard workflow and narrow viewport without claiming mobile-browser support.
- [x] 1.3 Integrate only justified analyser/visual components and license notices; verify cleanup, no second context, and measured route bundle impact.

## 2. Developer workflow

- [x] 2.1 Implement bounded JSON editing with last-valid behavior; verify errors, unsupported schema fields, and no arbitrary-code evaluation.
- [x] 2.2 Implement current-value/seed copy and equivalent raw Web Audio comparisons; typecheck and exercise both examples with setup and cleanup.
- [x] 2.3 Write Fumadocs quick start, recipes, lifecycle, parameters, buses/effects, and native interop pages for shipped capabilities; verify internal links and example compilation.

## 3. Site gate

- [x] 3.1 Add development/stable version labels and build metadata; verify previews consume the local package and unreleased APIs are clearly identified.
- [x] 3.2 Review the three-sound listening flow and optional additional recipes; record individual listening evidence and leave unaccepted sounds out of the gallery.
- [x] 3.3 Run site build, Chromium checks, local edit-loop verification, and public-content review; record evidence in verification.md and leave deployment unperformed.

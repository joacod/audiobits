# Interactive gallery and documentation: design

## Context

Step 04 accepted for the full gallery; an early core release can use the smaller Step 02–03 demo. This change is implemented locally with automated evidence. The maintainer confirmed gallery manual acceptance on 2026-10-06; see [verification](verification.md).

## Goals / Non-Goals

Deliver the bounded outcomes in [the proposal](proposal.md) and the scenarios in
[the capability spec](specs/sound-discovery/spec.md). Broader browser validation,
automatic npm publication, and unrelated ecosystem work are outside this step.

## Decisions

Follow [the website design](../../../../website.md). Use custom gallery layouts
with Fumadocs for documentation routes, sharing theme tokens and navigation.
Keep Next server rendering for static content and client islands for interactive
audio. The library remains framework independent.

Use shadcn/Base UI primitives for keyboard/touch controls. Evaluate audiocn as
a presentation integration that accepts AudioBits analyser data; do not adopt a
second engine/context lifecycle. React Bits treatments are optional and isolated.
Review imported code, dependencies, accessibility, and license notices.

Create a small recipe JSON editor with bounded validation and a last-valid state.
Copy examples include actual parameters/seed and required setup/cleanup. Compile
both AudioBits examples and raw Web Audio comparisons, with equivalent behavior.
Do not add arbitrary JavaScript execution or a code-editor framework.

Start with the accepted core sounds. Expand the collection only when each recipe
adds useful coverage and passes listening review; ten sounds are a direction,
not a release blocker. Record any deferred recipe needs in a future change.

Version/channel labels follow [the release design](../../../../releases.md).
Local/preview site builds use the local package. Stable docs must align with
published behavior. Keep contributor plans out of normal API navigation.

## Risks / Trade-offs

- Visual libraries can increase cost or own audio unexpectedly → inspect selected
  components and measure the production route bundles.
- Controls can overwhelm the page → expose only meaningful primary controls.
- Examples can drift → compile them against public exports in the site build.

## Migration Plan

Replace the minimal demo presentation while retaining its lifecycle behavior.
Before any deployment, confirm the chosen development/stable channel. This change
prepares the site; it does not itself authorize deployment.

## Implemented presentation choices

The gallery uses existing Base UI buttons, native labelled range/number inputs,
and native disclosures. No copied shadcn, audiocn, or React Bits component and no
additional dependency was justified. Textual playing states provide feedback;
an analyser animation would add continuous work without improving this bounded
listening workflow. Route JavaScript measurements are recorded in verification.

JSON text is bounded to 32 KiB before parsing, with at most ten displayed
validation issues and last-valid playback. Curated cards preserve their playback
kind and primary control range/default/mode; other declared parameters use
recipe defaults. Apply stops playback and replaces the old sound. Reset and
Restore return the bundled definition, seed, and primary controls to defaults.

Examples copy the accepted recipe plus current parameters and next-play seed,
using the default dry route independently of the gallery mixer. Raw comparisons
cover the bundled definitions, not arbitrary edited JSON. The edited AudioBits
example remains available; the raw comparison is hidden until Restore. Native
signal comparison covers noise, smooth controls, cancellation, and release.
Both displayed host implementations are compiled and exercised with teardown.

Every build identifies its local package version and source. Private/0.0.0
packages are labelled Unreleased; other local packages remain Development.
A stable release-aligned site remains a Step 06 publication decision, never an
automatic consequence of a production build.

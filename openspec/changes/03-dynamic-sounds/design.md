# Dynamic sounds and core milestone: design

## Context

Step 02 accepted, including working finite playback and resource ownership. This is a proposed change; no implementation or validation is implied
by the presence of these artifacts.

## Goals / Non-Goals

Deliver the bounded outcomes in [the proposal](proposal.md) and the scenarios in
[the capability spec](specs/dynamic-sound-controls/spec.md). Broader browser validation,
automatic npm publication, and unrelated ecosystem work are outside this step.

## Decisions

Extend the existing descriptor only when executor support lands. Follow the
bounded value grammar in [recipe-model](../../../docs/recipe-model.md), keeping
play-only mappings distinct from live mappings. Validate range extrema, not just
defaults. Live controls drive direct targets with parameter-declared smoothing;
automation point mappings can reference only play-only controls.

Choose xorshift32 with an explicitly documented nonzero internal state mapping
for zero seed, normalized property traversal, and known-vector tests. Expose the
actual seed on each voice. Generate noise at context sample rate with bounded
buffer storage; loop sustained noise with a tested seam treatment. Cache only
bounded primitive noise resources if necessary, not rendered recipe output.
Specify buffer length and eviction from measurements in this step before merge.

Sustained voices share the existing voice registry and release semantics. Updating
throttle changes native parameters on one voice; it never recreates the whole
graph. Parameter updates are atomic and reject unknown, out-of-range, or play-only
keys. Hold/cancel the old ramp at its current value before retargeting.

Implement the impact and thruster fixtures. Only introduce saturation if listening
demonstrates a gap and document its bounded transfer curve and test requirements
in this change before coding it. Core completion does not depend on adding it.

## Risks / Trade-offs

- Smooth data updates can still click → check signal continuity and listen.
- A repeated noise buffer can reveal its seam → design, measure, and audition
  the seam treatment; do not rely on randomness alone.
- Seed behavior can drift as traversal changes → preserve explicit-seed fixtures
  and document reproducibility scope before publishing schema v1.

## Migration Plan

Draft recipes are not released yet. Keep the three fixtures, generated metadata,
and docs synchronized. Record the core gate; npm publication is a separate
explicit action under the release design, never part of this step automatically.

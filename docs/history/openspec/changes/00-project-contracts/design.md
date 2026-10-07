# Planning design

## Context

The repository begins with a README and MIT license. There are no application
manifests or executable product scripts. The user requested a complete planning
baseline before implementation and explicitly selected Chromium-first testing.

## Goals / Non-Goals

Goals: resolve the core data/lifecycle/distribution boundaries and make each
implementation step independently reviewable. Keep documentation safe for public
distribution and distinguish future contracts from existing functionality.

Non-goals: installing the product stack, implementing audio, choosing a hosting
account, registering a package/domain, or publishing anything.

## Decisions

- Use the installed OpenSpec 1.14.0 `spec-driven` workflow. Initialize without
  machine-specific assistant integrations; AGENTS.md provides portable guidance.
- Keep [the roadmap](../../../../roadmap.md) as the step index. Each change owns
  its tasks and behavioral scenarios; avoid a second competing task checklist.
- Put shared detailed designs in [architecture](../../../../architecture.md),
  [recipes](../../../../recipe-model.md), [development](../../../../development.md),
  [release](../../../../releases.md), [validation](../../../../validation.md),
  and [website](../../../../website.md) documents. Changes link to them.
- Keep the ten-experience study separate from the three-sound implementation gate.
- Keep runtime changes unimplemented and unarchived until their acceptance passes.

## Risks / Trade-offs

- Future designs can drift → revisit dependent changes after each step's review.
- Public plans can imply implemented features → label status and keep README honest.
- Premature exact version claims can become stale → resolve and pin compatible
  stable versions during Step 01, with current official documentation.

## Migration Plan

No runtime migration. Preserve the existing license. Stop after planning
verification; Step 01 needs a separate implementation instruction.

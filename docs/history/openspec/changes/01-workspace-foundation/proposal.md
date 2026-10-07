# Workspace foundation

## Why

Library and website work need a reliable local feedback loop before audio features are added. Package correctness must be testable without publishing anything to npm.

## Prerequisites

Step 00 planning review.

## What Changes

- Create one runtime package, a private website workspace, and a private vanilla consumer.
- Implement public-export workspace linking, ordered builds, and a supervised development loop.
- Establish focused CI, package validation, SSR import checks, and Chromium tooling.

## Capabilities

### New Capabilities

- `workspace-development`: Library and website work need a reliable local feedback loop before audio features are added. Package correctness must be testable without publishing anything to npm.

### Modified Capabilities

None. This change adds a distinct capability; dependent behavior remains governed
by its earlier change and must be reconciled if implementation changes it.

## Impact

Adds workspace manifests, one lockfile, build/test configuration, minimal package and website entrypoints, and CI. No audio engine, sound gallery, production deployment, or npm publication.

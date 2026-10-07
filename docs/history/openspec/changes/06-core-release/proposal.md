# Core release readiness

## Why

A working core needs trustworthy packaging and version-aligned documentation before users install it. Site deployment and npm publication must remain independently controlled.

## Prerequisites

Normally Steps 01–05 accepted. An explicitly selected early-core scope may depend on Steps 01–03 only, with no claims about unimplemented later capabilities.

## What Changes

- Prepare a validated package candidate and version-aligned quick start.
- Add compact shipped-capability metadata and agent guidance based on tested APIs.
- Configure separate, protected release/deploy paths and document first-publication procedures.

## Capabilities

### New Capabilities

- `release-distribution`: A working core needs trustworthy packaging and version-aligned documentation before users install it. Site deployment and npm publication must remain independently controlled.

### Modified Capabilities

None. This change adds a distinct capability; dependent behavior remains governed
by its earlier change and must be reconciled if implementation changes it.

## Impact

Package metadata, Changesets, release checks, agent guidance, documentation channels, and release workflow definitions. This plan does not authorize registry publication, hosting setup, or deployment.

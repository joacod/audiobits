# Recipe playback and first sound: specification

## Purpose

The abstraction must produce a convincing sound and own playback safely before more synthesis features are added.

## ADDED Requirements

### Requirement: Validated data recipes

The library SHALL validate supported recipe data without audio allocation, reject unknown fields and schema versions, and return issues with a code, path, and message.

#### Scenario: Unsupported version

- **WHEN** a recipe declares an unsupported schema version
- **THEN** validation fails with a version issue and creates no audio resources

#### Scenario: Invalid structure

- **WHEN** input contains non-finite numbers, cycles, unknown keys, invalid timelines, or exceeded budgets
- **THEN** validation rejects it with bounded diagnostics before creating a voice

### Requirement: Immutable recipe snapshots

A reusable sound SHALL retain an immutable snapshot of its accepted recipe.

#### Scenario: Caller mutation

- **WHEN** a caller mutates the original object after definition
- **THEN** existing sounds keep their previously validated behavior

### Requirement: Gesture-based lazy start

The engine SHALL create browser audio only through an explicit start operation and SHALL report failed activation without replaying queued input.

#### Scenario: Pure construction

- **WHEN** a caller creates an engine handle without starting it
- **THEN** no audio context is allocated

#### Scenario: Blocked activation

- **WHEN** browser activation fails and the caller later retries with a gesture
- **THEN** the failure is observable and no earlier play request is replayed

### Requirement: Managed one-shot playback

Each successful play SHALL create an independent voice, follow gate and release timing, and release owned resources after completion.

#### Scenario: Overlapping playback

- **WHEN** a running engine plays the same finite sound twice
- **THEN** two independent voices can overlap and finish without reusing a stopped source

#### Scenario: Play before start

- **WHEN** a caller plays before the engine is running
- **THEN** a not-ready error occurs without allocating a voice

### Requirement: Smooth stop and scheduled cancellation

Voices SHALL use context-time scheduling, release from their current envelope value on stop, and support cancellation before onset.

#### Scenario: Stop during attack

- **WHEN** a voice is stopped while its attack is in progress
- **THEN** it releases from its current gain and subsequent stop calls cannot extend its lifetime

#### Scenario: Cancel future voice

- **WHEN** a future-scheduled voice is stopped before onset
- **THEN** it never becomes audible and its reserved resources are released

### Requirement: Bounded voice allocation

Playback SHALL enforce global and per-sound limits with deterministic oldest-voice stealing and bounded retiring resources.

#### Scenario: Rapid retriggering

- **WHEN** requests exceed a configured voice limit repeatedly
- **THEN** the oldest eligible voice retires and active plus retiring resources remain within the documented bound

### Requirement: Idempotent disposal

Disposal SHALL invalidate pending starts, stop managed voices, release owned resources, and leave the engine terminal.

#### Scenario: Dispose during start

- **WHEN** disposal occurs while context resume is pending
- **THEN** later resolution cannot leave a running orphan context or accept playback

#### Scenario: Repeated dispose

- **WHEN** a disposed engine is disposed again
- **THEN** the operation is safe and no new resources are created

#### Scenario: Dispose a suspended context

- **WHEN** the engine is disposed while its audio clock is suspended
- **THEN** owned records and connections are finalized without waiting for future audio events

### Requirement: Confirmation demonstration

The confirmation demo SHALL expose explicit playback and recovery controls without sound on page load.

#### Scenario: First play

- **WHEN** a visitor activates Play in Chromium
- **THEN** the gesture starts audio and plays one confirmation or shows an actionable error

#### Scenario: Leaving demo

- **WHEN** the visitor leaves the mounted demo
- **THEN** its engine and managed voices are disposed

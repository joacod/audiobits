# Dynamic sounds and core milestone: specification

## Purpose

Procedural sound earns its value through useful variation and continuous control. Two contrasting experiences must validate the recipe model beyond a single chime.

## ADDED Requirements

### Requirement: Bounded named controls

Recipes SHALL declare supported control ranges and modes, and playback SHALL reject invalid supplied controls before voice allocation.

#### Scenario: Invalid control input

- **WHEN** a play request includes an unknown name or out-of-range value
- **THEN** the entire request fails without allocating a voice

#### Scenario: Mapping extrema

- **WHEN** a mapping or random range can produce an invalid target even though its default is valid
- **THEN** recipe validation rejects that definition

### Requirement: Atomic live updates

A playing voice SHALL apply valid live-control updates with declared smoothing and SHALL reject invalid updates without partial changes.

#### Scenario: Rapid throttle changes

- **WHEN** a caller updates throttle repeatedly during a ramp
- **THEN** the same voice retargets from the current value without retriggering sources

#### Scenario: Play-only update

- **WHEN** a caller tries to update impact intensity after playback starts
- **THEN** the update fails and all existing control values remain unchanged

### Requirement: Sustained lifecycle

Sustained recipes SHALL continue until stopped or disposed and SHALL use managed release and cleanup semantics.

#### Scenario: Thruster stop

- **WHEN** a sustained thruster is stopped
- **THEN** its envelope releases and all owned voice resources are eventually released

#### Scenario: Update ended voice

- **WHEN** a caller changes controls after a voice is stopped or disposed
- **THEN** an ended-voice error occurs without creating resources

### Requirement: Seeded procedural variation

An explicit seed SHALL reproduce variation choices and generated noise for the same normalized recipe and sample rate, and the actual seed SHALL be inspectable.

#### Scenario: Seed replay

- **WHEN** two plays use the same recipe, parameters, seed, and sample rate
- **THEN** their sampled variation values and generated noise match

#### Scenario: Unspecified seed

- **WHEN** a play omits the seed
- **THEN** the resulting voice exposes the chosen seed for later replay

### Requirement: Bounded noise resources

Noise generation SHALL obey documented memory bounds and sustained noise SHALL use an explicit seam treatment.

#### Scenario: Long-running thruster

- **WHEN** a sustained noise voice runs and receives repeated control updates
- **THEN** its buffer allocation remains bounded instead of growing with playback time

#### Scenario: Noise cleanup

- **WHEN** all sounds using an owned noise resource are disposed
- **THEN** the resource is released or retained only within the documented bounded cache

### Requirement: Dynamic demonstrations

The impact and thruster demos SHALL expose their meaningful controls and stop behavior through the public library API.

#### Scenario: Impact intensity

- **WHEN** a visitor changes intensity and plays again
- **THEN** the recipe changes at least pitch or spectral character as well as level

#### Scenario: Continuous throttle

- **WHEN** a visitor adjusts throttle while the thruster runs
- **THEN** one active voice responds continuously and the Stop control ends it

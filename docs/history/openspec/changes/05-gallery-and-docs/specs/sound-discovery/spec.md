# Interactive gallery and documentation: specification

## Purpose

Developers should understand AudioBits by hearing and adjusting sounds, then copy examples that actually work with the documented library version.

## ADDED Requirements

### Requirement: Silent discovery and explicit playback

Visitors SHALL be able to browse sounds silently and start a selected sound with one explicit playback action.

#### Scenario: Initial visit

- **WHEN** a visitor opens the gallery
- **THEN** no sound starts automatically and each sound has a discoverable Play action

#### Scenario: Activation failure

- **WHEN** the browser does not start audio after Play
- **THEN** the affected control shows an actionable retry state

### Requirement: Usable sound controls

Each showcased sound SHALL expose its purpose, relevant controls, reset behavior, and an explicit stop action for continuous playback.

#### Scenario: Continuous sound

- **WHEN** a visitor starts the thruster and changes throttle
- **THEN** its playing state and Stop action remain visible

#### Scenario: Reset

- **WHEN** a visitor resets a sound's controls
- **THEN** the documented defaults are restored

### Requirement: Validated recipe editing

The recipe editor SHALL report bounded validation errors and SHALL not execute arbitrary code or replace the last valid sound with invalid input.

#### Scenario: Invalid edit

- **WHEN** a visitor edits a recipe to an unsupported or invalid value
- **THEN** the editor identifies the issue path and preserves the last valid playable recipe

### Requirement: Copyable current examples

Copied examples SHALL include the current supported parameters and seed where applicable and SHALL match the displayed library version.

#### Scenario: Copy adjusted sound

- **WHEN** a visitor changes controls and copies the example
- **THEN** the copied example reproduces the supported configuration using public exports

### Requirement: Fair implementation comparison

Raw Web Audio comparisons SHALL implement equivalent sound behavior and lifecycle responsibilities.

#### Scenario: Compare example

- **WHEN** a visitor opens the raw implementation comparison
- **THEN** it includes equivalent setup and cleanup without intentionally inflated code

### Requirement: Accessible and optional visualization

Controls SHALL support keyboard interaction and non-audio state feedback; decorative motion SHALL respect reduced-motion preferences.

#### Scenario: Keyboard use

- **WHEN** a visitor navigates and adjusts controls with a keyboard
- **THEN** play, stop, reset, mute, copy, and parameter adjustment remain usable

#### Scenario: Reduced motion

- **WHEN** reduced motion is requested
- **THEN** decorative visualization is reduced or paused without disabling sound controls

### Requirement: Version-honest documentation

The site SHALL distinguish development/unreleased behavior from published package documentation.

#### Scenario: Unreleased build

- **WHEN** a preview contains an API not published to npm
- **THEN** the development status is visible and the page does not claim that API is in the stable package

# Mixing, effects, and application lifecycle: specification

## Purpose

Applications need coherent volume groups and lifecycle handling once the recipe core works. Routing and native interoperability must not undermine ownership or leave audible tails behind.

## ADDED Requirements

### Requirement: Named bus hierarchy

The engine SHALL support named buses with one parent each and SHALL reject cycles and cross-engine routes before changing existing routing.

#### Scenario: Route replacement

- **WHEN** a bus is assigned a valid new parent
- **THEN** the old owned route is removed and no duplicate output route remains

#### Scenario: Invalid parent

- **WHEN** a requested parent creates a cycle or belongs to another engine
- **THEN** the request fails with the previous routing unchanged

### Requirement: Independent gain and mute

Bus mute SHALL preserve the bus's configured gain and automation.

#### Scenario: Mute during ramp

- **WHEN** a bus is muted while its volume changes and later unmuted
- **THEN** its volume follows the configured automation instead of being reset by mute

### Requirement: Bounded shared effects

Shared delay SHALL reject invalid settings and SHALL release or reset audible tails within the documented cutoff.

#### Scenario: Invalid feedback

- **WHEN** a caller sets feedback outside the permitted range or positive feedback with zero delay
- **THEN** the update is rejected without disturbing the existing valid effect

#### Scenario: Tail cutoff

- **WHEN** a shared delay continues after its last input stops
- **THEN** its output ends by the documented maximum tail duration

### Requirement: Explicit stop and tail policy

Stopping all managed audio SHALL support preserving bounded shared tails or cutting them, while disposal SHALL remove all owned tails.

#### Scenario: Gallery Stop all

- **WHEN** the visitor invokes Stop all while a delay tail is audible
- **THEN** managed sources stop and shared tails are cut using the documented fade/reset

#### Scenario: Engine disposal

- **WHEN** the engine is disposed with voices and effects active
- **THEN** all owned output and graph resources are released

### Requirement: Bus disposal

Disposing a non-master bus SHALL stop its routed voices and dispose its descendant buses and owned effects.

#### Scenario: Dispose subtree

- **WHEN** a bus with active child buses is disposed
- **THEN** no voice or owned effect in that subtree remains active

#### Scenario: Master disposal request

- **WHEN** a caller attempts to dispose master independently
- **THEN** the request is rejected with guidance to dispose the engine

### Requirement: Native ownership boundary

Native integration SHALL reject foreign contexts and SHALL document that caller-created sources remain outside managed voice ownership.

#### Scenario: Foreign native node

- **WHEN** a caller connects a node from another audio context
- **THEN** the connection is rejected before graph mutation

#### Scenario: Native analyser example

- **WHEN** a consumer attaches an analyser to the owned output
- **THEN** the example reads levels without duplicate audible routing and removes its own listeners/connections on cleanup

### Requirement: No stale playback after hiding

The gallery SHALL invalidate pending starts when hidden, stop its audio, and require a fresh user action after returning.

#### Scenario: Hide during resume

- **WHEN** the gallery becomes hidden while resume is pending
- **THEN** late completion cannot start a stale sound

#### Scenario: Return to page

- **WHEN** a visitor returns to a previously hidden gallery
- **THEN** audio remains stopped until a new Play action

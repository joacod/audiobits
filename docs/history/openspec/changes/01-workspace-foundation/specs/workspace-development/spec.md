# Workspace foundation: specification

## Purpose

Library and website work need a reliable local feedback loop before audio features are added. Package correctness must be testable without publishing anything to npm.

## ADDED Requirements

### Requirement: Local package resolution

The website and example consumers SHALL resolve the local runtime package through its public exports without requiring registry publication.

#### Scenario: Local library edit

- **WHEN** a developer changes an exported runtime value and its build completes
- **THEN** the local site consumes the changed output without a version bump or npm upload

#### Scenario: Missing workspace package

- **WHEN** the declared local runtime package is absent
- **THEN** dependency installation fails instead of resolving an unrelated registry package

### Requirement: Ordered development startup

The development command SHALL complete the initial library build before starting the website and SHALL terminate its child processes when stopped or failed.

#### Scenario: Clean checkout startup

- **WHEN** a developer starts development after a clean dependency install
- **THEN** the site starts with available package exports and declarations

#### Scenario: Build failure

- **WHEN** the initial library build fails
- **THEN** the command reports failure and does not leave a website running against stale output

### Requirement: Independent build outputs

The repository SHALL allow building the website and packing the runtime independently, with the site build including its local runtime dependency.

#### Scenario: Website build

- **WHEN** a contributor builds the website
- **THEN** the matching local library is built first and no npm publication occurs

### Requirement: Portable package consumption

The packed runtime SHALL provide ESM exports and TypeScript declarations consumable without workspace source access.

#### Scenario: Isolated install

- **WHEN** a clean external consumer installs the local archive
- **THEN** its import and typecheck succeed using only files included in that archive

### Requirement: Import without browser effects

Importing the runtime SHALL not access browser-only globals or instantiate an audio context.

#### Scenario: Server import

- **WHEN** a Node process imports the built package without window or AudioContext
- **THEN** the import succeeds without browser initialization

### Requirement: Private non-library workspaces

The root, website, and example workspaces SHALL be marked private and SHALL be excluded from npm release targets.

#### Scenario: Release target inspection

- **WHEN** a contributor inspects candidate publish targets
- **THEN** the website, root, and examples are not publishable artifacts

# Core release readiness: specification

## Purpose

A working core needs trustworthy packaging and version-aligned documentation before users install it. Site deployment and npm publication must remain independently controlled.

## ADDED Requirements

### Requirement: Independent release actions

Website deployment and npm publication SHALL be separate actions; neither SHALL implicitly trigger the other.

#### Scenario: Docs-only update

- **WHEN** a documentation correction is deployed
- **THEN** the runtime package version and npm registry remain unchanged

#### Scenario: Website build

- **WHEN** a site build succeeds with a local library change
- **THEN** no package is published automatically

### Requirement: Working core prerequisite

A first package release SHALL require accepted core functionality, package validation, Chromium evidence, and explicit publication approval.

#### Scenario: Planning-only package

- **WHEN** a candidate has complete specs but no accepted working core
- **THEN** publication remains disabled

#### Scenario: Core-only candidate

- **WHEN** the accepted three-sound core is selected for an early release
- **THEN** the candidate excludes unimplemented later capabilities and does not require broader browser support

### Requirement: Reviewed package contents

A release candidate SHALL contain all required runtime/declaration/metadata files and SHALL exclude private, unrelated, and development-only content.

#### Scenario: Archive verification

- **WHEN** the candidate is packed and installed in an isolated consumer
- **THEN** public imports, types, and documented usage work without repository source

#### Scenario: Private content detected

- **WHEN** archive inspection finds a private path, secret, or unintended source artifact
- **THEN** release is blocked until the candidate is corrected and rechecked

### Requirement: Version-aligned stable site

Stable documentation SHALL correspond to released functionality and previews SHALL label unreleased behavior.

#### Scenario: Failed package release

- **WHEN** npm publication fails before a proposed stable site promotion
- **THEN** the prior stable documentation remains the production reference

#### Scenario: Stable docs correction

- **WHEN** a release-aligned documentation fix is ready
- **THEN** it can deploy without changing the released library

### Requirement: Authoritative shipped metadata

Package metadata and agent guidance SHALL describe only capabilities implemented in the candidate version.

#### Scenario: Installed schema lookup

- **WHEN** a tool reads the candidate schema and capability metadata
- **THEN** the described recipe operations match its executor and validation behavior

#### Scenario: Deferred feature

- **WHEN** a future feature is present only in a design document
- **THEN** the candidate Skill and metadata do not advertise it as available

### Requirement: Explicit activation boundary

Release preparation SHALL remain possible without production credentials, and actual publishing/deployment SHALL require separately authorized activation.

#### Scenario: Local release rehearsal

- **WHEN** a contributor validates and packs the core locally
- **THEN** all readiness checks can run without registry write credentials

#### Scenario: Unapproved publication

- **WHEN** checks pass but publication has not been approved
- **THEN** no registry write or production deployment occurs

# Tasks

Prerequisite: Step 00 planning review. Step 01 was selected and implemented.
Local evidence is recorded in [verification.md](verification.md); stop at the
Step 01 review boundary. Command names match the implemented package scripts.

## 1. Workspace and dependency setup

- [x] 1.1 Resolve compatible stable tool versions and create exact-pinned manifests plus lockfile; verify a clean frozen install and record the Node/package-manager baseline.
- [x] 1.2 Add private root/site/example workspaces and guarded runtime package exports; verify workspace resolution and no runtime framework dependencies.
- [x] 1.3 Implement tsdown ESM/declaration generation and a package file allowlist; verify emitted imports and types in the vanilla consumer.

## 2. Local loop and package boundary

- [x] 2.1 Implement the development supervisor and site build ordering; verify clean startup, library edit visibility, failure propagation, and termination of both processes.
- [x] 2.2 Add isolated tarball consumption and Node import checks; verify no source aliases, workspace fallback, or browser globals are required.
- [x] 2.3 Document the verified root commands in README/development guidance; execute the documented happy path from clean build output.

## 3. Focused CI

- [x] 3.1 Add lint, formatting, typecheck, unit, package, site-build and minimal Chromium jobs; verify the commands locally and keep deployment/publication disabled.
- [x] 3.2 Record Step 01 evidence and public-content review in verification.md; confirm no audio functionality or other-browser support is claimed.

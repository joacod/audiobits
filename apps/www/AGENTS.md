# AudioBits website agent rules

These instructions apply to `apps/www`.

Read root `AGENTS.md` first.

## Catalog audio workflow

- For creating or tuning catalog sounds and interactive experiences, use the
  [AudioBits Skill](../../skills/audiobits/SKILL.md) and its relevant references
  before editing. The website consumes the single canonical Skill through
  `.agents/skills/audiobits`; do not copy or install another version here.
- Use `apps/www` as the consumer project for AudioBits MCP inspection,
  compatibility checks and recipe validation when the tools are available.
  Continue with public exports and existing checks when MCP is unavailable.
- Edit owned source in `catalog/` directly. MCP catalog retrieval uses a reviewed
  snapshot, not uncommitted source. Verify the website behavior and listen to
  sound changes; MCP validation does not synthesize or assess audio quality.
- When this workflow exposes a gap in the Skill or MCP, improve its canonical
  source within the requested scope and rebuild generated MCP output as needed.
  Do not load the Skill for unrelated layout, copy, documentation or library work.

## Route purposes

- `/` = discovery. Make a new visitor understand and want AudioBits.
- `/catalog` = the browsing index for interactive experiences and catalog sounds.
- `/catalog/[slug]` = one sound workbench or interactive showcase. Hear and
  manipulate it, then install sound source and connect the usage example.
- `/docs` = Fumadocs reference documentation. Keep it calm, readable,
  predictable, and separate from the showcase experience.

The routes may share implementation machinery. Do not split architecture merely
because their human purposes differ.

## Boundaries

- Ordinary website work must not modify the audio runtime or recipe contracts
  merely for presentation or UI conveniences.
- Explicit sound-first catalog initiatives may evaluate and implement justified
  runtime or recipe improvements under the [root architecture rules](../../AGENTS.md#architecture-boundaries)
  and [package rules](../../packages/audiobits/AGENTS.md).
- Presentation metadata stays outside `SoundRecipe`. Use the root catalog
  distribution rules for showcase/source boundaries and copy fidelity.
- Website-only dependencies stay inside `apps/www`.
- Fumadocs keeps its stock neutral styling, layout, typography, light/dark
  palettes and theme switching. Dark mode is the default. Scope AudioBits showcase
  presentation tokens and fonts to `.foundation`.
- Do not make documentation pages inherit showcase motion or heavy visual
  effects.
- Use real AudioBits analyser output for signal/audio-reactive visuals where
  practical.
- Reuse the existing pulse / harmonic / flow visualization families instead
  of building a bespoke renderer for every sound.

## Design

- Preserve the AudioBits showcase design (Void, Ink, signal gradient on live elements,
  Big Shoulders Display and Geist Mono; see DESIGN.md) unless the
  task explicitly requests a redesign.
- Sound is the hero. Visual effects must support the audio rather than compete
  with it.
- Do not turn the site into a React Bits sampler or generic shadcn layout.
- Use React Bits, audiocn, shadcn-style primitives, or other website-only tools
  selectively where they materially improve the experience.
- Interactive AudioBits showcases prioritize direct mouse/touch interaction,
  strong sound design, and immersive visuals. Do not introduce visible Play,
  Start, Mute, Stop, or alternative-action panels by default when those actions
  already work naturally through the stage. Only add visible controls that
  materially improve the intended experience.
- Existing unobtrusive keyboard shortcuts, meaningful error recovery, and proper
  audio cleanup may remain. Do not create a second UI solely to duplicate every
  pointer gesture or expand accessibility implementation and test scope beyond
  the requested task.
- Use `audio-gesture-surface` and `lib/audio-gestures.ts` for interactive sound
  surfaces. Disable selection, native dragging and long-press callouts only there.
  The shared helper owns native activation attempts and surface-specific default
  handling; hosts own sound intent, release and cancellation. Activation never
  replays a released or cancelled interaction. Maintain one press, hold, drag
  and release lifecycle across mouse, touch and pen. Do not redefine a silent
  first interaction followed by a second interaction as the intended UX.
- When a showcase needs audio prepared before its interaction, register its
  engine factory in `lib/experience-audio.ts`, navigate through `ExperienceLink`,
  and take the prepared engine at mount. The host then owns disposal. This is an
  optional preparation path, not a required input model for every experience.
  Use the same lifecycle across input methods without browser-name branches.
  Keep direct-entry verification separate from navigation preparation; see the
  [activation guidance](<content/docs/(runtime)/lifecycle.mdx#held-touch-and-earlier-activation>).
- Stop on interruptions and preserve hosts on persisted `pagehide`; dispose on
  teardown.
- Respect reduced motion and responsive behavior. Keep ordinary documentation,
  forms, navigation, and installation controls functional and understandable,
  including keyboard access and visible focus.
- Use the [installed Impeccable skill](.agents/skills/impeccable/SKILL.md)
  for substantial visual/UX redesign work.
- Do not load or invoke Impeccable for small bug fixes, copy changes, or
  ordinary implementation work.

## Verification

- Copy/content-only changes: run only relevant static/build checks. When visible
  copy is likely to affect wrapping or viewport fit, include the relevant
  existing Chromium layout test before handoff. For homepage copy, use the
  landing composition tests in `landing.spec.ts`.
- Visual-only changes: lint/typecheck/build plus focused visual inspection.
- Changed website interaction: run the affected Chromium Playwright test(s).
- Follow the root [testing policy](../../docs/validation.md#test-selection).
  When controls or gestures change, search browser tests for stale references
  and run affected tests. Use the full suite for broad impact or explicit requests.
  Reproduce timing-sensitive graphics regressions at their committed viewport;
  preserve meaningful assertions without increasing timeouts or adding retries.
- Do not run package release gates or compatibility suites for ordinary website
  work.

## Scope

- Do not redesign adjacent routes when changing one route unless explicitly
  requested.
- Do not replace the design system while fixing a local issue.
- Do not add dependencies unless the requested work clearly needs them.
- Do not refactor unrelated components simply because they are nearby.
- Stop when the requested website task and focused checks are complete.

For React/Next.js code, use the local
[React best practices](.agents/skills/vercel-react-best-practices/SKILL.md)
within the requested scope. Scope custom styles beneath `.foundation` or dedicated
gallery classes; preserve Fumadocs theme imports and providers. Check a
representative docs page when changing shared styles.

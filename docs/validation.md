# Validation and acceptance design

Use existing unit, type, browser and packed-package checks. Historical acceptance
is separate from new sound acceptance. Record meaningful results in the PR;
a recurring evidence-document process is not required.

## Browser policy

Playwright projects cover Chromium, Firefox and WebKit for the release candidate.
Record the pinned Playwright version and actual engine versions with failures
and release evidence. WebKit automation is not physical Safari/iOS evidence.
Listening, background interruptions and device changes need separate review.

Fix observed differences rather than adding hypothetical workarounds. Compare
signal properties within each engine; native sample identity across engines is
not guaranteed. Chromium remains the isolated packed-consumer browser gate.

## Checks by boundary

| Boundary          | Evidence                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Pure recipe layer | Valid/invalid fixtures, unknown keys/versions, bounds, JSON round trip, immutable snapshot, stable issue paths       |
| Compiler          | Parameter extrema, reference resolution, automation order, duration/release calculation, seeded choices              |
| Native signal     | Matrix OfflineAudioContext: finite samples, non-silence, expected duration, energy regions, peak/headroom            |
| Live engine       | Matrix AudioContext: gesture start, overlap, scheduled cancellation, stop/dispose, pending-start races, voice limits |
| Site              | Keyboard controls, error recovery, mute/stop, route cleanup, development/release labels, example typechecking        |
| Package           | Built ESM exports, declarations, metadata, tree-shaking check, SSR-safe import, isolated tarball consumer            |

Offline rendering can test signal properties, but not autoplay, actual device
interruption, page lifecycle, or live context cleanup. Mocks can test race logic,
but the corresponding public workflow also needs a real browser check.

## Initial measurable budgets

Use these property and resource bounds with documented gain and concurrency.
They do not establish subjective quality.

- All rendered samples are finite. Curated single-voice default peaks remain
  below -6 dBFS at the master; eight simultaneous finite core voices must stay
  below 0 dBFS. Keep quality tuning and resource limits distinct.
- Active and retiring voice counts obey [the architecture limits](architecture.md).
  After finite tails, stop, or disposal, owned counts return to baseline.
- Repeatedly trigger/stop 1000 voices in bounded batches in Chromium; no retained
  voice records or owned connection records after completion. This is a resource
  regression check, not proof of zero browser-internal memory retention.
- Offline duration matches gate plus release/tail within one render quantum
  where applicable. Check the actual energy falloff with tolerances rather than
  exact sample equality.
- Record package size, cold preparation time, and repeated-play scheduling cost
  on a named test environment. Set numeric performance budgets from the first
  measured baseline; do not invent universal latency or CPU guarantees.

Document the number of simultaneous voices and default master settings used for
peak checks. These checks do not guarantee clipping-free output for arbitrary
recipes, native extensions, or maximum engine concurrency.

## Listening gate

For each core sound, listen at default settings and control extrema, with
repeated triggers, fast parameter changes, and stop during attack/sustain/release.
Record who or what performed the review, browser, output device category, observed
issues, and whether it passed. Do not record personal machine paths or identifiers.

Review tonal character, transient smoothness, noise loop seams, fatigue, relative
loudness, and usefulness of controls. A user listening report is valid evidence;
absence of one must remain an explicit gap. Automated screenshots or sample
energy cannot establish pleasantness.

## Public-content review

Review all changed and new files, not just the tracked diff. Inspect prose,
examples, comments, configuration, generated package files, and source maps for
private paths, personal information, credentials, internal links, and unsupported
claims. Check relative Markdown links. Preserve the license.

Record the scope of review accurately: a local content review does not establish
that remote Git history, hosted previews, or registry artifacts were inspected.

## Real-device follow-up

After engine automation, perform real Safari/iOS and mobile listening/lifecycle
checks. Exercise backgrounding, interruption, device changes and repeated user
activation. Expand support claims only to the validated scope.

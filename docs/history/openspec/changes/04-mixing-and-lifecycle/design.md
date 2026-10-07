# Mixing, effects, and application lifecycle: design

## Context

Step 03 core accepted. Implementation and automated verification are recorded in [verification.md](verification.md);
maintainer manual acceptance was confirmed on 2026-10-06.

## Goals / Non-Goals

Deliver the bounded outcomes in [the proposal](proposal.md) and the scenarios in
[the capability spec](specs/application-audio-routing/spec.md). Broader browser validation,
automatic npm publication, and unrelated ecosystem work are outside this step.

## Decisions

Use a single-parent bus tree rooted at master, with at most 32 live buses
including master. Buses and native access require successful startup. Bus lookup reuses a live named bus.
Reject cycles and cross-engine parents before mutation; route replacement is
atomic and removes the old owned connection. Gain and mute have separate nodes,
so muting does not destroy a volume ramp. Disposing a bus stops routed voices
and recursively disposes child buses; reject disposal of master except through
engine disposal. Make name reuse after disposal explicit: a new lookup creates
a fresh bus.

Add an owned shared delay with seconds in [0, 2], feedback in [0, 0.9], and wet in
[0, 1]. Reject updates outside bounds. Delay is an additive wet send alongside unity dry output. Tails stop at the
conservative -60 dB feedback-decay estimate (first echo plus repeats, including
descendant tail allowance for a parent) or at a
maximum 5 seconds, whichever is earlier; reset uses a 5 ms wet-output fade and at most one fading replacement.
Cut detaches delay input immediately; fresh playback recreates retained settings.
A disconnected oscillator sentinel uses the audio clock for final disconnection;
suspension/interruption/disposal finalize it without waiting for clock progress. Keep delay zero with feedback zero a supported dry/wet
case; reject zero delay with positive feedback to avoid an immediate feedback loop.

Normal voice stop allows already emitted shared tails within that cap.
`audio.stopAll({ tails: "cut" })` cuts/reset shared tails after the short fade;
default `tails: "allow"` preserves the bounded natural decay. The site's Stop
all uses cut. Engine disposal cuts all owned tails immediately as teardown.

Expose a narrow native output/context integration with an analyser example.
Reject foreign-context connections. Caller-created nodes remain caller-owned;
stopAll cannot promise to stop unmanaged sources. Document that engine disposal
closes its context and invalidates those nodes.

The site stops managed audio with cut tails before suspending on hide. A generation
token invalidates pending starts after hide/unmount; returning never resumes
without another gesture. Unit tests cover races; real Chromium checks cover
the observable path. Where native interruption cannot be induced automatically,
record the limitation and a manual scenario rather than claiming coverage.

Do not make stop-and-suspend cleanup depend indefinitely on future audio time or
`onended`. Finalize stopped owned resources when the context is no longer running,
and test hide/dispose while suspended as well as during resume.

## Risks / Trade-offs

- Bus effects retain energy after a voice ends → separate voice lifetime from
  bounded bus-tail lifetime and test both.
- Native escape hatches weaken ownership guarantees → keep caller ownership
  explicit and show cleanup in the example.
- OS interruptions are hard to simulate → distinguish state-machine tests from
  observed device behavior.

## Migration Plan

Add APIs without changing the established default master route. If an early
core release exists, include a Changeset and preserve its documented contracts.
Revise draft semantics before release if needed; do not silently break persisted
recipe behavior.

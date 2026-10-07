# AudioBits

Unreleased procedural browser audio library. The workspace supports validated
one-shot oscillator recipes and managed playback. This private package has not
been published; Chromium automation is the initial browser evidence. The confirmation fixture also passed maintainer manual verification; browser
and output-device details were not recorded.

## Play from a gesture

```ts
import { createAudio } from "audiobits";
import { confirmation } from "audiobits/recipes";

const audio = createAudio(); // No context is created here.
const sound = audio.sound(confirmation); // Pure validation and snapshot.

playButton.addEventListener("click", () => {
  void audio
    .start()
    .then(() => sound.play())
    .catch(showError);
});
stopButton.addEventListener("click", () => audio.stopAll());
window.addEventListener("pagehide", () => {
  void audio.dispose();
});
```

`playButton`, `stopButton`, and `showError` belong to the host application.
The site and vanilla workspace provide typechecked examples with teardown.
Call `start()` synchronously in a gesture handler, then await it before playing.
A failed start reports `AudioBitsError` with a retryable `start-failed` code.
A resume that remains blocked times out after two wall-clock seconds; the
context stays owned for gesture retry. This deadline does not schedule audio.
Play before activation fails with `not-ready`; no input is queued.

## Supported data

`defineSound(unknown)` validates and returns a deeply frozen `Recipe` snapshot.
`validateRecipe(unknown)` returns `{ ok: true, recipe }` or
`{ ok: false, issues }`; every issue has `code`, `path`, and `message`.
Paths use JSON bracket notation, such as `$["layers"][0]["id"]`.
`AudioBitsError` carries `code` and `issues`; errors during validation use
`invalid-recipe`. The input must be plain JSON data without accessors or cycles.
Unknown fields and versions are rejected. Validation is browser-independent.

Draft schema version 1 currently supports:

- One-shot gates in `(0, 60]` seconds, with 1–16 uniquely identified layers.
- Sine, triangle, sawtooth, and square oscillators; numeric Hz or linear/
  exponential frequency automation beginning at zero and ending by gate close.
- Layer gain from -60 to 0 dB and fixed ADSR envelopes. Attack/decay are 0–10 s,
  sustain is 0–1, release is 0.005–10 s. Effective attack is at least 0.002 s;
  effective attack plus decay must fit within the gate. A zero decay ramps
  directly to sustain rather than introducing an instantaneous peak.
- Numeric lowpass/highpass/bandpass filters with frequency 20–20000 Hz and
  Q 0.1–20. At most eight filters and 128 frequency points across the recipe.

Depth is limited to 16, visited values to 10000, and diagnostics to 100.
Source/filter frequencies must be below the owning context's Nyquist frequency
at playback. Sustained sounds, noise, parameters, mappings, variation, and other
effects are rejected. These are draft capabilities, not released schema promises.
The generated schema is available as `recipeSchema` or `audiobits/schema.json`.

## Runtime ownership

`createAudio({ maxVoices, maxVoicesPerSound, masterGainDb })` defaults to
32 active voices per engine, eight per sound, and -12 dB master gain. Limits
must be integers from 1–128; master gain must be -60–0 dB. `setMuted(boolean)`
uses a separate mute setting and a 5 ms gain ramp.

`sound.play({ at, gainDb, pan })` creates fresh sources synchronously. `at` is
absolute audio-context time, obtained by the host's own scheduling logic;
this step intentionally exposes no native context accessor. Omit it for
immediate playback. Past timestamps are rejected. Playback gain is -60–0 dB
(default 0), pan is -1–1 (default 0). Future voices reserve capacity.

`voice.stop()` cancels before onset or releases from the current envelope value.
Repeated stops cannot extend lifetime. `voice.ended` resolves after owned nodes
are disconnected; `voice.state` is `active`, `stopping`, `retiring`, or `ended`.
Stopping voices keep their capacity reservation until cleanup. Oldest-voice
stealing uses a 5 ms output fade. There is at most one retiring voice beyond
engine/per-sound limits; another steal finalizes the previous retiree first.
`audio.counts` distinguishes reserved active/stopping voices from retirees.

Gate duration excludes release. Filters receive a bounded 50 ms tail allowance;
output fades to zero over the final 5 ms. Layer filters precede their envelopes.
`stopAll()` releases managed voices. `sound.dispose()` immediately finalizes
that sound's voices. `audio.suspend()` finalizes all voices before suspending.
Native suspension/interruption also finalizes voices when its state event arrives.
`audio.dispose()` invalidates pending startup, finalizes voices immediately,
disconnects master output, and closes the context once, even while suspended.
Disposal is terminal and idempotent; no audio-clock progress is needed.

`audio.state` reports `idle`, `starting`, `running`, `suspended`, `interrupted`,
`closed`, or `disposed`. `subscribe(listener)` returns an unsubscribe function.
Concurrent starts share one promise. A host controls visibility/navigation policy;
the engine does not replay sounds or automatically resume them.

Recipes contain no native nodes, callbacks, framework imports, or runtime
dependencies. Only `audiobits/recipes` imports the curated confirmation data.
Default headroom checks do not guarantee safe peaks for arbitrary recipes,
filter resonance, gains, or concurrency.

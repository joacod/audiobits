# AudioBits

Unreleased procedural browser audio library. The private development package
supports one-shot and sustained oscillator/noise recipes, seeded variation,
and managed live controls. Chromium automation is the initial browser evidence.
Confirmation passed the Step 02 maintainer listening review; the Step 03
three-sound listening gate also passed maintainer manual verification. Browser
and output-device details for that manual review were not supplied. Nothing has been published.

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

- One-shot gates in `(0, 60]` seconds or sustained playback until Stop, with
  1–16 uniquely identified layers. Sustained recipes forbid `duration`.
- Sine, triangle, sawtooth, and square oscillators; numeric Hz or linear/
  exponential frequency automation beginning at zero and ending by gate close
  (at most 60 seconds of onset automation for sustained voices). White noise
  uses bounded generated buffers; there is no audio-file fetch.
- Layer gain from -60 to 0 dB and fixed ADSR envelopes. Attack/decay are 0–10 s,
  sustain is 0–1, release is 0.005–10 s. Effective attack is at least 0.002 s;
  effective attack plus decay must fit within the gate. A zero decay ramps
  directly to sustain rather than introducing an instantaneous peak.
- Lowpass/highpass/bandpass filters with frequency 20–20000 Hz and numeric
  Q 0.1–20. At most eight filters and 128 frequency points across the recipe.
- Source/filter frequencies accept numeric values, mappings, variation, or
  automation. Layer gain accepts numeric values, mappings, or variation;
  gain automation and variable envelope times are not supported.
- Up to 16 named parameters with `min < max`, an in-range `default`, and `mode`
  of `play` or `live`. Live parameters require `smoothing` in 0.005–1 seconds.
  Names begin with an ASCII letter and contain letters, digits or underscores,
  up to 64 characters. Declaration numbers are bounded to -60000–60000.

Depth is limited to 16, visited values to 10000, and diagnostics to 100.
Source/filter frequencies must be below the owning context's Nyquist frequency
at playback, including all mapping/variation extrema. Other effects,
expression strings, sequencing, and continuous random modulation are rejected. These are draft capabilities, not released schema promises.
The generated schema is available as `recipeSchema` or `audiobits/schema.json`.

## Runtime ownership

`createAudio({ maxVoices, maxVoicesPerSound, masterGainDb })` defaults to
32 active voices per engine, eight per sound, and -12 dB master gain. Limits
must be integers from 1–128; master gain must be -60–0 dB. `setMuted(boolean)`
uses a separate mute setting and a 5 ms gain ramp.

`sound.play({ at, gainDb, pan, parameters, seed })` creates fresh sources synchronously. `at` is
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
that sound's voices and noise buffers. `audio.suspend()` finalizes all voices before suspending.
Native suspension/interruption also finalizes voices when its state event arrives.
`audio.dispose()` invalidates pending startup, finalizes voices immediately,
disconnects master output, and closes the context once, even while suspended.
Disposal is terminal and idempotent; no audio-clock progress is needed.

`audio.state` reports `idle`, `starting`, `running`, `suspended`, `interrupted`,
`closed`, or `disposed`. `subscribe(listener)` returns an unsubscribe function.
Concurrent starts share one promise. A host controls visibility/navigation policy;
the engine does not replay sounds or automatically resume them.

Recipes contain no native nodes, callbacks, framework imports, or runtime
dependencies. Only `audiobits/recipes` imports the curated confirmation, impact, and thruster data.
Default headroom checks do not guarantee safe peaks for arbitrary recipes,
filter resonance, gains, or concurrency.

## Dynamic controls and replay

```ts
import { createAudio } from "audiobits";
import { impact, thruster } from "audiobits/recipes";

const audio = createAudio();
const hit = audio.sound(impact);
const engine = audio.sound(thruster);

// In a user gesture, await activation before creating voices.
await audio.start();
hit.play({ parameters: { intensity: 0.8 }, seed: 42 });
const voice = engine.play({ parameters: { throttle: 0.2 }, seed: 42 });
voice.set({ throttle: 1 }); // Update this voice without retriggering.
console.log(voice.seed, voice.parameters);
voice.stop();
await voice.ended;
await audio.dispose();
```

Omitted parameters use recipe defaults. Invalid names, non-finite values,
out-of-range controls, and invalid seeds fail before graph allocation or voice
stealing. Updates validate every supplied key before changing any parameter;
play-only controls cannot be updated. `voice.parameters` is a frozen snapshot of
requested values, not a readback of the current smoothed native parameters.
`voice.set()` after Stop, retirement, completion, or disposal throws
`ended-voice`; other control errors use `invalid-control`.

Mappings use `{ control, range: [low, high], scale }`, where scale is `linear`
or `exponential`. Exponential mapping endpoints must be positive. Mapping ranges
may descend; random ranges `{ random: [low, high] }` must be ordered. All extrema
must satisfy the target range. Automation points can reference only play-only
controls. Direct live mappings support source frequency, layer gain, and filter
frequency. Native targets ramp linearly over the parameter's smoothing time,
from their current value on every retarget. For gain, that ramp is in linear
amplitude after dB conversion; mapping scale describes the control-to-target
conversion, not the ramp curve. Envelopes remain fixed and independent of live
level controls, so release remains continuous.

Seeds are unsigned 32-bit integers, including zero. Without one, playback chooses
a seed and exposes it on `voice.seed`. xorshift32 uses shifts 13/17/5 and divides
its unsigned state by 2^32; seed zero maps internally to `0x6d2b79f5`. Resolution
traverses root effects, then layers in array order. Each layer resolves gain,
layer filters, source frequency, and a noise seed, in that order; automation
points follow time order. Each variation consumes one draw, and each noise layer
consumes one draw for its own xorshift32 stream. Object property insertion order
does not change this traversal. This draft algorithm reproduces choices and
noise for the same normalized recipe, controls, seed and sample rate; it does not
promise identical oscillator/filter samples across browsers or sample rates.

## Noise ownership and bounds

Each noise layer owns one mono, one-second buffer at context sample rate. The
last 20 ms crossfades into the first 20 ms; looping resumes after that prefix,
so the wrap follows an ordinary adjacent sample pair. The loop period is about
0.98 seconds. Both finite and sustained noise loop this bounded resource.
This treatment has signal evidence and maintainer listening acceptance;
individual listening observations were not recorded. There is no shared noise cache or rendered-output cache.

Noise supports integer sample rates from 8000 through 192000 Hz. Unsupported
rates fail with `noise-rate` before voice allocation. A layer retains at most
768000 sample bytes (192000 at 48 kHz); generation temporarily uses one extra
buffer of that size. A recipe has at most 16 layers, and existing voice limits
bound concurrent buffers. The thruster owns ten nodes and one buffer per voice;
with its default eight-voice limit plus one retiree, sample storage is at most
1728000 bytes at 48 kHz. The engine master is one additional node. These are
owned sample-storage bounds, not measurements of all browser memory.

Control updates allocate no new audio nodes or buffers. Finishing a voice clears
its buffer-source references and disconnects owned nodes, including cancellation
before onset, stealing, sound disposal, and engine teardown. Browser-internal
reclamation timing remains outside the library's control.

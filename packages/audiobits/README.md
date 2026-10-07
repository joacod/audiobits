# AudioBits

Private, unreleased **0.1.0-rc.0** candidate. It includes confirmation, impact, thruster, tactile click, gentle rejection,
glass notification, whoosh and power-up; schema-1 recipes; play/live controls; seeded variation; bounded
voices; buses and shared delay; native output taps; and explicit lifecycle APIs.
Chromium, Firefox and Playwright WebKit are the automated candidate matrix.
Physical Safari/iOS and mobile devices are not verified. Maintainer listening acceptance for the
unchanged sound definitions is recorded separately. Nothing has been published,
and the final npm identifier and ownership remain unconfirmed.

## Try the candidate locally

Install the reviewed archive into your own private consumer with
`npm install /path/to/audiobits-0.1.0-rc.0.tgz`. This is a local file install,
not an instruction to install an existing registry package. Use a browser
bundler and call `play()` directly from a gesture handler. Surface rejection
with `void play().catch(showError)` and retry from a fresh gesture.

```ts
import { createAudio } from "audiobits";
import { confirmation } from "audiobits/recipes";

const audio = createAudio();
const sound = audio.sound(confirmation);
export async function play() {
  await audio.start();
  sound.play();
}
export function stop() {
  audio.stopAll({ tails: "cut" });
}
export async function dispose() {
  await audio.dispose();
}
```

Bind `play()` to a button click (`void play().catch(showError)`).

## Production lifecycle

For an SPA, invalidate pending activation when hiding or unmounting; suspend on
hide and dispose on navigation. Returning requires a fresh Play gesture.

```ts
import { createAudio } from "audiobits";
import { confirmation } from "audiobits/recipes";
const audio = createAudio();
const sound = audio.sound(confirmation);
let request = 0;
export async function play() {
  const token = ++request;
  await audio.start();
  if (token === request && !document.hidden) sound.play({ seed: 42 });
}
export function stop() {
  request++;
  audio.stopAll({ tails: "cut" });
}
function hide() {
  if (document.hidden) {
    stop();
    void audio.suspend().catch(console.error);
  }
}
document.addEventListener("visibilitychange", hide);
export async function dispose() {
  stop();
  document.removeEventListener("visibilitychange", hide);
  await audio.dispose();
}
```

`createAudio()` and `audio.sound()` create no context. A failed start reports
`AudioBitsError` with a retryable `start-failed` code. A blocked resume times out
after two wall-clock seconds; the context stays owned for gesture retry. Play
before activation fails with `not-ready`; no input is queued.

The archive exports `audiobits/schema.json` and `audiobits/capabilities.json`.
The latter identifies candidate version, shipped primitives, initial Chromium gate and candidate browser matrix;
the schema is structural, while `validateRecipe` enforces additional semantic
limits. Agent guidance is included in [the AudioBits Skill](skill/SKILL.md).

## Supported data

`defineSound(recipe)` accepts typed authored data, preserves literal parameter names and modes, validates and returns a deeply frozen `Recipe` snapshot.
For external JSON, `validateRecipe(unknown)` returns `{ ok: true, recipe }` or
`{ ok: false, issues }`; every issue has `code`, `path`, and `message`.
Paths use JSON bracket notation, such as `$["layers"][0]["id"]`.
`AudioBitsError` carries `code` and `issues`; errors during validation use
`invalid-recipe`. The input must be plain JSON data without accessors or cycles.
Unknown fields and versions are rejected. Validation is browser-independent.

Candidate schema version 1 supports:

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

`sound.play({ at, gainDb, pan, parameters, seed, bus })` creates fresh sources synchronously. `at` is
absolute audio-context time, obtained by the host's own scheduling logic;
available after startup as `audio.native.context.currentTime`. Omit it for
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
`stopAll()` releases managed voices and allows bounded shared delay tails.
`stopAll({ tails: "cut" })` uses a 5 ms source/output fade and resets shared delays. `sound.dispose()` immediately finalizes
that sound's voices and noise buffers. `audio.suspend()` invalidates pending starts and finalizes all voices and shared effects before suspending.
Native suspension/interruption also finalizes voices when its state event arrives.
`audio.dispose()` invalidates pending startup, finalizes voices immediately,
disconnects master output, and closes the context once, even while suspended.
Disposal is terminal and idempotent; no audio-clock progress is needed.

`audio.state` reports `idle`, `starting`, `running`, `suspended`, `interrupted`,
`closed`, or `disposed`. `subscribe(listener)` returns an unsubscribe function.
Concurrent starts share one promise. A host controls visibility/navigation policy;
the engine does not replay sounds or automatically resume them.

Recipes contain no native nodes, callbacks, framework imports, or runtime
dependencies. Only `audiobits/recipes` imports curated sound data.
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
1728000 bytes at 48 kHz. The engine master owns two additional nodes for independent gain and mute. These are
owned sample-storage bounds, not measurements of all browser memory.

Control updates allocate no new audio nodes or buffers. Finishing a voice clears
its buffer-source references and disconnects owned nodes, including cancellation
before onset, stealing, sound disposal, and engine teardown. Browser-internal
reclamation timing remains outside the library's control.

## Buses and shared delay

After `await audio.start()`, `audio.master` is the root bus. `audio.bus(name,
parent = audio.master)` creates a named bus or reuses the live bus with that
name; use `setParent()` to move an existing bus. Names contain 1–64 characters
and cannot be blank. At most 32 buses, including master, may be live. Routes
form a single-parent tree; invalid, disposed, foreign-engine, and cyclic
parents fail before changing the previous connection. Reassigning the same
parent does not create another route. `sound.play({ bus })` defaults to master
and rejects foreign/disposed buses before voice allocation or stealing.

`bus.setGainDb(value, rampSeconds = 0.005)` accepts -60–0 dB and 0–10 seconds.
It holds the current native value before ramping. `bus.setMuted(boolean)` uses
an independent 5 ms stage, preserving volume automation. `audio.setMuted()`
controls master mute, including a setting made before startup.

```ts
import { createAudio } from "audiobits";
import { confirmation } from "audiobits/recipes";
const audio = createAudio();
const sound = audio.sound(confirmation);
// In a gesture handler, after activating this engine:
await audio.start();
const effects = audio.bus("effects");
effects.setGainDb(-6, 0.1);
effects.setDelay({ seconds: 0.18, feedback: 0.35, wet: 0.25 });
const voice = sound.play({ bus: effects });
voice.stop(); // Emitted delay energy decays within its cap.
audio.stopAll({ tails: "cut" }); // Fade/reset all owned shared tails.
effects.dispose(); // Finalize voices, descendant buses, and shared effects.
await audio.dispose();
```

Delay is a shared additive send: dry output remains at unity and `wet` adds
0–1 times the delayed signal. Delay time accepts 0–2 seconds and feedback
0–0.9. Zero delay requires zero feedback. Settings are copied and validated
before graph replacement; `setDelay(null)` removes the effect. Replacement
fades the previous wet output over 5 ms. Each bus retains at most one fading
replacement; another reset finalizes the previous retiree first.

When the last managed input ends, output fades to zero at the conservative
-60 dB feedback-decay estimate or five seconds, whichever is earlier.
The estimate counts the first echo plus repeats; parent buses include their
children's tail allowance, still capped at five seconds. An audio-clock
sentinel disconnects the effect at cutoff. Fresh playback reconstructs a
finished/reset delay with its retained settings. Suspended/interrupted/closed
cleanup and disposal disconnect immediately without waiting for clock events.
A bus owns two base nodes, five per live delay, at most one tail sentinel,
and at most one fading old delay with its sentinel. Delay storage belongs to
native Web Audio; these node bounds do not measure browser heap use.

Non-master bus disposal is idempotent and stops routed voices recursively.
A later lookup of that name creates a fresh bus. `master.dispose()` fails;
dispose the engine to release master. Engine disposal removes all owned
output and closes its context, even while suspended or starting.

## Native analyser and caller ownership

`audio.native` is available after startup and exposes the owned `context`,
master `output`, and `connect(node)` tap helper. The helper rejects foreign
contexts, duplicate taps, the output itself, and the context destination.
It returns an idempotent detach function. Master already connects to the
speaker destination. Leave an analyser's output unconnected to avoid a second
audible path. The vanilla example reads peak levels with a host animation
frame, cancels that frame, detaches the tap, and disconnects its analyser
before engine teardown.

```ts
import { createAudio } from "audiobits";
const audio = createAudio();
// Execute in a gesture handler.
await audio.start();
const native = audio.native;
const analyser = native.context.createAnalyser();
const detach = native.connect(analyser);
const samples = new Float32Array(analyser.fftSize);
analyser.getFloatTimeDomainData(samples);
// Host teardown:
detach();
analyser.disconnect();
await audio.dispose();
```

Caller-created nodes, sources, connections, and animation listeners are
caller-owned. Stop unmanaged sources explicitly: `stopAll()` cannot stop them.
Direct native graph operations remain the caller's responsibility and cannot
be serialized as recipes. Closing the engine context invalidates these native
nodes; retained native handles do not transfer ownership back to the engine.

The site and vanilla demo invalidate pending Play actions, cut managed tails,
and suspend on hide. Returning does not resume; a fresh gesture starts audio.
Late activation after suspension is cancelled and cannot replay an old request.
The engine also clears owned voices/effects on native interruption; automatic
native recovery is suspended until a fresh `start()` request. Physical OS
interruption still requires manual evidence. Step 04 passed maintainer manual
verification on 2026-10-06. Browser/device details and individual observations
were not supplied; automated checks remain separate from that acceptance.

`Bus.setDelay()` and `DelayOptions` are experimental and may change before 0.1.
Shared delay is not a stable generalized effect API.

## Curated sounds

The eight exports live in `audiobits/recipes`: `confirmation`, `impact`, `thruster`,
`tactileClick`, `gentleRejection`, `glassNotification`, `whoosh`, and `powerUp`.
Intensity controls impact, click and power-up; brightness controls glass; size
controls whoosh; throttle is live on thruster. Other sounds have no parameters.
New sound definitions use only schema-1 sources, filters and envelopes. Their
signal and resource properties are tested; listening acceptance is still pending.

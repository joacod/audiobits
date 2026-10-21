# Riff Reactor

Install with `npx shadcn@latest add joacod/audiobits/riff-reactor`.
You own and may modify the installed source.
The item installs `recipe.ts`, `song.ts`, `controller.ts`, and this guide under
`src/sounds/experiences/riff-reactor/`. `audiobits` is the only runtime
dependency.

## Application integration

Use this example in `src/integration.ts`. Connect `play()` directly to a user
gesture and handle activation errors. Connect your input handling to
`performLead()` and `choke()`, map your own performance score to `update()`,
connect `stop()` to cancellation, and `dispose()` to removal:

```ts
import { createAudio } from "audiobits";
import { createRiff } from "./sounds/experiences/riff-reactor/controller";
import { riffReactorSong } from "./sounds/experiences/riff-reactor/song";

// The band's top tier needs about 30 voices; 48 keeps stealing out of reach.
const audio = createAudio({ maxVoices: 48, masterGainDb: -8 });
const riff = createRiff(audio, riffReactorSong);
let request = 0;

export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request) return;
  // Starts the band from the top. Returns the audio-clock transport.
  riff.start();
}

// Your judge decides that an input hit lead note `index`.
export function hit(index: number) {
  return riff.performLead(index);
}

// A stray or wrong input. The band keeps playing at its level.
export function miss() {
  riff.choke();
}

// Normalized performance in [0, 1]. The tier lands on the next bar line.
export function update(performance: number) {
  riff.setIntensity(performance >= 0.75 ? 2 : performance >= 0.35 ? 1 : 0);
}

export function stop() {
  request++;
  riff.stop();
}

export async function dispose() {
  stop();
  riff.dispose();
  await audio.dispose();
}
```

### One clock

`riff.transport` converts beats to and from `AudioContext` time; `beatAt(time)`
is the same conversion. The band is scheduled on that clock in 150 ms
lookahead batches refilled every 25 ms, so tempo never drifts with frame rate
or timers. Judge input and draw notes against the same transport. Read the
context time once when an input arrives and subtract `riff.latency`, the total
output latency (`baseLatency` plus `outputLatency`, either may be missing), so
judging matches what the player hears:
`riff.beatAt(context.currentTime - riff.latency)`.

### Song and tiers

`song.ts` holds _Reactor Core_, an original 60-second track in E minor at
128 BPM: intro, verse, chorus, break and final chorus over 32 bars, then a
closing downbeat. Every band event carries a minimum intensity tier. Tier 0 is
drums, bass, pad and chorus chugs; tier 1 adds the arpeggio, open hats, ghost
notes, bass octaves and verse chugs; tier 2 adds sixteenth hats, extra kicks,
fills and pushes. `setIntensity()` lands on the next bar line that has not been
scheduled yet. Replace the song with your own `RiffSong` data.

### Lead

`song.lead` is the performed part and is never played by the controller on
its own. `performLead(index)` plays that note immediately, at its charted pitch,
until its charted end; it is never quantized. The lead is monophonic: a new hit
stops the previous note. A missed note is a gap in the lead while the band keeps
its level; `choke()` adds a short muted thunk for stray inputs.

A performed note ends within about 12 ms of its charted end, not exactly on
it: the stop runs on the 25 ms refill tick, which is a main-thread timer, so a
busy main thread can also hold the note late. The release masks small errors.
An exact end would need a scheduled stop such as `voice.stop({ at })` in the
AudioBits core.

### Lifecycle and budget

The controller routes every voice through one bus per instrument group under a
per-session band bus, so `stop()` is one short fade. `stop()` and `dispose()`
are safe to repeat, and an interrupted or suspended engine stops the song.
Stale refills and voice endings from an earlier session change nothing.
Background tabs throttle timers, so stop or suspend on hiding. At the top tier
with every lead note hit, booked voices included, the sum of per-sound peaks is
34 voices, so `maxVoices: 48` never steals across sounds. Only the lead's echo
tails reach the per-sound limit of 8, which retires that sound's oldest tail.
With `masterGainDb: -8`, the full mix (top tier, every lead note hit) peaked at
-6.36 dBFS in one offline render. That figure was measured once and is not
covered by an automated test.

When sharing an engine, dispose only this controller on removal; the
application owns engine suspension and final disposal. Returning requires a
fresh user gesture. See the
[lifecycle guide](https://www.audiobits.dev/docs/lifecycle).

## Repository showcase

The complete [public showcase](https://www.audiobits.dev/catalog/riff-reactor)
and
[repository source](https://github.com/joacod/audiobits/tree/main/catalog/experiences/riff-reactor)
remain available. The website note highway, lanes, judging, streaks and scoring
are repository examples and are excluded from installation.

Source contents and targets are defined by the root `registry.json`. Recipes use
schema 1 and public AudioBits exports. Automated browser verification targets
Chromium; signal and lifecycle checks do not establish listening quality or
physical-device compatibility.

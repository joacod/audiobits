# Riff Reactor

Install with `npx shadcn@latest add joacod/audiobits/riff-reactor`.
You own and may modify the installed source.
The item installs recipes, music helpers, instruments, a song, a controller,
and this guide under
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
import { riffInstruments } from "./sounds/experiences/riff-reactor/instruments";

// The band's top tier needs about 30 voices; 48 keeps stealing out of reach.
const audio = createAudio({ maxVoices: 48, masterGainDb: -8 });
// Optional fourth argument: choose or edit recipes independently of the song.
const riff = createRiff(
  audio,
  riffReactorSong,
  {},
  {
    bass: riffInstruments.bass,
  },
);
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
closing downbeat. The verse opens with a repeated two-note motif and sparse
backing at every tier, then adds quicker notes and the full rhythm section.
The chorus develops that motif in a higher register, with extra runs saved for
the final repeat. Every band event carries a minimum intensity tier. Tier 0 is
drums, bass, pad and chorus chugs; tier 1 adds the arpeggio, open hats, ghost
notes, bass octaves and verse chugs; tier 2 adds sixteenth hats, extra kicks,
fills and pushes. `setIntensity()` lands on the next bar line that has not been
scheduled yet. Replace the song with your own `RiffSong` data.

### Write notes and choose instruments

`music.ts` uses scientific pitch notation: `C4` is middle C, `A4` is 440 Hz,
`F#4` and `Gb4` are the same pitch. It supports single sharps/flats and MIDI
pitches 0 through 127 in twelve-tone equal temperament. Times and lengths are
quarter-note beats: `1` is a quarter note, `0.5` an eighth, `1.5` a dotted
quarter, and `1 / 3` an eighth-note triplet. BPM counts quarter notes.

In `src/song.ts`, write a phrase like this:

```ts
import { phrase, transpose } from "./sounds/experiences/riff-reactor/music";

export const melody = phrase([
  // onset, length, pitch, optional velocity (default 0.8)
  [0, 1, "C4"],
  [1, 0.5, "D4", 0.7],
  [2, 1.5, transpose("G4", -12)],
]);
export const harmony = phrase([[0, 4, ["C4", "E4", "G4"]]], 4);
```

Gaps are rests. An array of pitches expands into simultaneous notes. The second
argument offsets a phrase in beats, so phrases can repeat at different bars.
`phrase()` returns ordinary `{ beat, length, note, velocity }` events with MIDI
pitches, compatible with `RiffSong`. This is a small TypeScript authoring helper,
not a new score interchange format. Scientific pitch notation also underlies
[MusicXML pitch data](https://www.w3.org/2021/06/musicxml40/tutorial/midi-compatible-part/).
Importing sheet music, tempo changes and score engraving are outside its scope.

`riffInstruments` selects the existing pick bass, power-chord pad, plucked arp,
chord stab, sustained lead, drums and effects from `recipe.ts`. These are synth
presets, not sampled acoustic instruments. Edit a recipe or supply replacements
in `createRiff`'s fourth argument. Band parts and the choke require one-shots;
the lead requires a sustained recipe. Pitched parts use a `frequency` control,
and `velocity`, when declared, controls dynamics. Keep notes within each recipe's
frequency range and recheck voice budgets and the mix when changing presets.
The arp and lead echoes remain tuned to 128 BPM.

For another host, `createInstrument(audio, recipe)` from `instrument.ts` returns
an instrument with `play({ note: "E3", velocity: 0.8, at, bus })` and `dispose()`.
`at` is AudioContext time, obtainable from `createTransport(bpm, origin).timeAt(beat)`.
Play only after activation. Retain the returned voice to cancel or stop it, and
dispose the instrument when removing it. It neither starts nor disposes the engine.

A written length describes the musical event, not automatic envelope stretching.
One-shots keep their recipe's duration and tails. The Riff controller releases the
sustained lead at its written end; a custom host must stop sustained voices itself.
The Riff lead is monophonic, so use chord arrays for polyphonic band parts, not
its performed lead. The existing pad and stab already sound power chords from
one root. Use a single-tone preset when spelling out a different chord.

### Lead

`song.lead` is the performed part and is never played by the controller on
its own. `performLead(index)` plays that note immediately, at its charted pitch,
until its charted end; it is never quantized. The lead is monophonic: a new hit
stops the previous note. A missed note is a gap in the lead while the band keeps
its level; `choke()` adds a short muted thunk for stray inputs.

A performed note schedules `voice.stop({ at: end })` as soon as it starts.
Release begins at the charted end on the audio clock, independently of refill
timers or main-thread stalls. The recipe's release envelope and effect tails
then finish normally. Replacement and choke can release the note earlier.

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

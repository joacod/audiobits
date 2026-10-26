/** Scientific pitch notation, with C4 = middle C and A4 = 440 Hz. */
export type NoteName =
  `${"A" | "B" | "C" | "D" | "E" | "F" | "G"}${"" | "#" | "b"}${number}`;
export type Pitch = NoteName | number;

const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Numeric semitone positions (C4 = 60), independent of instrument timbre. */
export function noteToMidi(note: Pitch): number {
  let midi: number;
  if (typeof note === "number") midi = note;
  else {
    const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
    if (!match) throw new RangeError(`Invalid note: ${note}`);
    midi =
      (Number(match[3]) + 1) * 12 +
      semitones[match[1] as keyof typeof semitones] +
      (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
  }
  if (!Number.isInteger(midi) || midi < 0 || midi > 127)
    throw new RangeError(`Note outside supported pitch range 0..127: ${note}`);
  return midi;
}

export const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
export const noteToHz = (note: Pitch) => midiToHz(noteToMidi(note));

/** Transpose by semitones, returning a canonical sharp spelling. */
export function transpose(note: Pitch, interval: number): NoteName {
  const midi = noteToMidi(noteToMidi(note) + interval);
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}` as NoteName;
}

/** [onset, duration, pitch or chord, optional velocity], in quarter-note beats. */
export type Phrase = readonly (readonly [
  beat: number,
  length: number,
  note: Pitch | readonly Pitch[],
  velocity?: number,
])[];

/** Compile readable notation to ordinary events. Gaps are rests; equal beats overlap. */
export function phrase(notes: Phrase, at = 0) {
  if (!Number.isFinite(at) || at < 0)
    throw new RangeError("Invalid phrase offset");
  return notes
    .flatMap(([beat, length, pitches, velocity = 0.8]) => {
      if (
        !Number.isFinite(beat) ||
        beat < 0 ||
        !Number.isFinite(length) ||
        length <= 0
      )
        throw new RangeError(
          "Phrase beats must be nonnegative and lengths positive",
        );
      if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1)
        throw new RangeError("Velocity must be in 0..1");
      const chord = typeof pitches === "object" ? pitches : [pitches];
      return chord.map((note) => ({
        beat: at + beat,
        length,
        note: noteToMidi(note),
        velocity,
      }));
    })
    .sort((a, b) => a.beat - b.beat);
}

/** One tempo, with beat zero anchored to AudioContext seconds. */
export interface Transport {
  readonly origin: number;
  readonly secondsPerBeat: number;
  beatAt(time: number): number;
  timeAt(beat: number): number;
}

export function createTransport(bpm: number, origin: number): Transport {
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(origin))
    throw new RangeError("Transport needs a positive tempo and finite origin");
  const secondsPerBeat = 60 / bpm;
  return Object.freeze({
    origin,
    secondsPerBeat,
    beatAt: (time: number) => (time - origin) / secondsPerBeat,
    timeAt: (beat: number) => origin + beat * secondsPerBeat,
  });
}

import type { RiffNote, RiffSong } from "./controller";
import {
  noteToMidi,
  phrase,
  transpose,
  type NoteName,
  type Phrase,
} from "./music";

// "Reactor Core": an original 60-second synth-rock track in E minor at 128 BPM.
// Composition data only. Write scientific pitch names and quarter-note beats.
// Helpers compile them to MIDI numbers for the controller and game chart.
// tier is the minimum intensity at which a band event plays: 0 is the base
// arrangement, 1 adds harmony and lift, 2 thickens everything.
// The lead is the part the player performs; it is never scheduled by itself.
//
// Form: intro (bars 1-4), verse (5-12), chorus (13-20), break (21-24),
// final chorus (25-32), and a closing downbeat on beat 128.

const E = "E2",
  C = "C2",
  D = "D2",
  G = "G2",
  A = "A2",
  B = "B1";
const minor = new Set<NoteName>([E, A]);
/** Chord root per bar, in the bass register. */
const roots: readonly NoteName[] = [
  ...([E, E, E, E] as const),
  ...([E, E, C, D, E, E, C, D] as const),
  ...([C, G, D, E, C, G, D, E] as const),
  ...([A, A, C, B] as const),
  ...([C, G, D, E, C, G, D, E] as const),
];
type Section = "intro" | "verse" | "chorus" | "break";
const sectionOf = (bar: number): Section =>
  bar < 4
    ? "intro"
    : bar < 12
      ? "verse"
      : bar < 20 || bar >= 24
        ? "chorus"
        : "break";

type Tier = 0 | 1 | 2;
const kick: RiffNote[] = [];
const snare: RiffNote[] = [];
const hat: RiffNote[] = [];
const openHat: RiffNote[] = [];
const bass: RiffNote[] = [];
const pad: RiffNote[] = [];
const arp: RiffNote[] = [];
const stab: RiffNote[] = [];
const riser: RiffNote[] = [];
const crash: RiffNote[] = [];
const hit = (
  track: RiffNote[],
  beat: number,
  velocity: number,
  tier: Tier = 0,
  note?: NoteName,
  length = 0.25,
) =>
  track.push({
    beat,
    length,
    velocity,
    tier,
    ...(note === undefined ? {} : { note: noteToMidi(note) }),
  });

for (let bar = 0; bar < roots.length; bar++) {
  const at = bar * 4;
  const root = roots[bar];
  const section = sectionOf(bar);
  const third = minor.has(root) ? 3 : 4;
  const turnaround = bar % 4 === 3;
  if (section === "intro") {
    for (const beat of bar < 2 ? [0, 2] : [0, 1, 2, 3])
      hit(kick, at + beat, 0.9);
    for (let step = 0; step < 8; step++)
      hit(hat, at + step / 2, step % 2 ? 0.45 : 0.65);
    if (bar >= 2) {
      hit(snare, at + 3, 0.8);
      for (let step = 0; step < 8; step++)
        hit(bass, at + step / 2, step % 2 ? 0.6 : 0.8, 0, root);
    }
    hit(pad, at, 0.55, 0, root, 4);
    if (bar === 3) hit(riser, at, 1, 0);
    continue;
  }
  // Give the opening motif space at every intensity. The full rhythm section
  // joins in the second half of the verse, after the repeated lead phrase.
  if (section === "verse" && bar < 8) {
    if (bar === 4) hit(crash, at, 0.65);
    for (let beat = 0; beat < 4; beat++) {
      hit(kick, at + beat, beat ? 0.8 : 0.9);
      hit(hat, at + beat, 0.55);
      hit(bass, at + beat, beat ? 0.75 : 0.9, 0, root);
      if (bar >= 6) hit(hat, at + beat + 0.5, 0.35);
    }
    hit(snare, at + 1, 0.8);
    hit(snare, at + 3, 0.85);
    hit(pad, at, 0.55, 0, root, 4);
    continue;
  }
  if (section === "break") {
    hit(kick, at, 1);
    hit(kick, at + 2.5, 0.8);
    hit(snare, at + 2, 0.9);
    for (let step = 0; step < 4; step++) hit(hat, at + step, 0.55);
    for (let step = 0; step < 4; step++) hit(hat, at + step + 0.5, 0.4, 1);
    for (const beat of [0, 0.5, 2.5, 3]) hit(bass, at + beat, 0.8, 0, root);
    hit(pad, at, 0.75, 0, root, 4);
    const tones = [0, 7, 12, 12 + third, 12, 7, third, 7];
    for (let step = 0; step < 8; step++)
      hit(arp, at + step / 2, 0.55, 0, transpose(root, 24 + tones[step]));
    if (bar === 23) {
      hit(riser, at, 1, 0);
      for (const beat of [3, 3.25, 3.5, 3.75])
        hit(snare, at + beat, 0.45 + (beat - 3) * 0.6, 1);
    }
    continue;
  }
  const chorus = section === "chorus";
  if (bar === 12 || bar === 24) hit(crash, at, 0.9);
  if (bar === 16 || bar === 28) hit(crash, at, 0.75, 1);
  for (let beat = 0; beat < 4; beat++) hit(kick, at + beat, beat ? 0.85 : 1);
  hit(kick, at + 2.5, 0.6, 2);
  if (turnaround) hit(kick, at + 3.75, 0.55, 2);
  hit(snare, at + 1, 0.9);
  hit(snare, at + 3, 0.95);
  hit(snare, at + 3.75, 0.32, 1);
  hit(snare, at + 1.75, 0.28, 2);
  if (turnaround)
    for (const beat of [3.25, 3.5])
      hit(snare, at + beat, 0.4 + (beat - 3) * 0.5, 2);
  for (let step = 0; step < 8; step++)
    hit(hat, at + step / 2, step % 2 ? 0.5 : 0.7);
  for (let step = 0; step < 8; step++) hit(hat, at + step / 2 + 0.25, 0.32, 2);
  hit(openHat, at + 1.5, 0.6, 1);
  hit(openHat, at + 3.5, 0.65, 1);
  for (let step = 0; step < 8; step++)
    hit(bass, at + step / 2, step % 2 ? 0.75 : 0.95, 0, root);
  const octave = transpose(root, 12);
  for (const beat of [1.75, 3.75])
    hit(
      bass,
      at + beat,
      0.6,
      1,
      noteToMidi(octave) <= noteToMidi("G3") ? octave : root,
    );
  hit(pad, at, chorus ? 0.8 : 0.6, 0, root, 4);
  const tones = chorus
    ? [12, 7, 12 + third, 7, 19, 7, 12 + third, 7]
    : [0, 7, 12, 7, third, 7, 12, 7];
  for (let step = 0; step < 8; step++)
    hit(
      arp,
      at + step / 2,
      chorus ? 0.6 : 0.5,
      1,
      transpose(root, 24 + tones[step]),
    );
  // Syncopated power-chord chugs: the rhythm part. Base in the chorus,
  // harmony tier in the verse, and extra pushes at the top tier.
  for (const beat of [0, 0.75, 1.5, 2.5, 3.25])
    hit(
      stab,
      at + beat,
      chorus ? 0.75 : 0.6,
      chorus ? 0 : 1,
      transpose(root, 12),
    );
  for (const beat of [2, 3.75])
    hit(stab, at + beat, 0.5, 2, transpose(root, 12));
  if (bar === 11) hit(riser, at, 0.9, 1);
}
// The closing downbeat rings the whole band out.
hit(kick, 128, 1);
hit(crash, 128, 1);
hit(bass, 128, 1, 0, E);
hit(pad, 128, 0.9, 0, E, 4);
hit(stab, 128, 0.85, 0, transpose(E, 12));

/** Lead phrases as [beat within the bar, length in beats, pitch name]. */
// Introduce the chorus's G-E shape in a lower register, repeat it, then add
// quarter notes. The opening stays on the beat before introducing syncopation.
const openingMotif: Phrase = [
  [0, 2, "G4"],
  [2, 2, "E4"],
];
const opening: Phrase[] = [
  openingMotif,
  openingMotif,
  [
    [0, 2, "G4"],
    [2, 1, "E4"],
    [3, 1, "G4"],
  ],
  [
    [0, 2, "A4"],
    [2, 1, "F#4"],
    [3, 1, "A4"],
  ],
];
// Develop the same hook before its octave lift into the chorus.
const verse: Phrase[] = [
  [
    [0, 1.5, "G4"],
    [1.5, 0.5, "E4"],
    [2, 1, "G4"],
    [3, 1, "A4"],
  ],
  [
    [0, 1.5, "B4"],
    [1.5, 0.5, "A4"],
    [2, 1, "G4"],
    [3, 1, "E4"],
  ],
  [
    [0, 1, "G4"],
    [1, 1, "C5"],
    [2, 0.5, "B4"],
    [2.5, 0.5, "A4"],
    [3, 1, "G4"],
  ],
];
const verseLift: Phrase = [
  [0, 0.5, "F#4"],
  [0.5, 0.5, "A4"],
  [1, 0.5, "D5"],
  [1.5, 0.5, "E5"],
  [2, 2, "F#5"],
];
const chorus: Phrase[] = [
  [
    [0, 1.5, "G5"],
    [1.5, 0.5, "E5"],
    [2, 1, "G5"],
    [3, 1, "A5"],
  ],
  [
    [0, 1.5, "B5"],
    [1.5, 0.5, "A5"],
    [2, 1, "G5"],
    [3, 1, "D5"],
  ],
  [
    [0, 1, "F#5"],
    [1, 1, "A5"],
    [2, 0.5, "F#5"],
    [2.5, 0.5, "E5"],
    [3, 1, "D5"],
  ],
  [
    [0, 2, "E5"],
    [2, 0.5, "B4"],
    [2.5, 0.5, "D5"],
    [3, 1, "E5"],
  ],
];
const chorusTurn: Phrase = [
  [0, 1, "E5"],
  [1, 0.5, "G5"],
  [1.5, 0.5, "F#5"],
  [2, 2, "E5"],
];
// Save the extra runs for the last repeat, keeping the chorus's main accents.
const finalChorus: Phrase[] = [
  [
    [0, 1.5, "G5"],
    [1.5, 0.5, "E5"],
    [2, 1, "G5"],
    [3, 0.5, "A5"],
    [3.5, 0.5, "G5"],
  ],
  [
    [0, 1.5, "B5"],
    [1.5, 0.5, "A5"],
    [2, 0.5, "G5"],
    [2.5, 0.5, "F#5"],
    [3, 0.5, "E5"],
    [3.5, 0.5, "D5"],
  ],
  [
    [0, 1, "F#5"],
    [1, 0.5, "A5"],
    [1.5, 0.5, "G5"],
    [2, 0.5, "F#5"],
    [2.5, 0.5, "E5"],
    [3, 1, "D5"],
  ],
];
const finalTurn: Phrase = [
  [0, 1, "G5"],
  [1, 1, "A5"],
  [2, 2, "B5"],
];
const breakdown: Phrase[] = [
  [
    [0, 2, "A4"],
    [2, 1, "C5"],
    [3, 1, "B4"],
  ],
  [
    [0, 3, "A4"],
    [3, 1, "E5"],
  ],
  [
    [0, 2, "G5"],
    [2, 2, "E5"],
  ],
  [
    [0, 2, "F#5"],
    [2, 1, "D#5"],
    [3, 1, "B4"],
  ],
];
const leadBars: Phrase[] = [
  ...opening,
  ...verse,
  verseLift,
  ...chorus,
  ...chorus.slice(0, 3),
  chorusTurn,
  ...breakdown,
  ...chorus,
  ...finalChorus,
  finalTurn,
];
const lead: RiffNote[] = leadBars.flatMap((notes, index) =>
  phrase(notes, (index + 4) * 4).map((note) => ({
    ...note,
    velocity: note.beat % 4 === 0 ? 0.95 : 0.85,
  })),
);
lead.push(...phrase([[128, 2, "E5", 1]]));

const freeze = (notes: RiffNote[]) =>
  Object.freeze(notes.map((note) => Object.freeze(note)));

export const riffReactorSong: RiffSong = Object.freeze({
  title: "Reactor Core",
  bpm: 128,
  beatsPerBar: 4,
  bars: 32,
  band: Object.freeze({
    kick: freeze(kick),
    snare: freeze(snare),
    hat: freeze(hat),
    openHat: freeze(openHat),
    bass: freeze(bass),
    pad: freeze(pad),
    arp: freeze(arp),
    stab: freeze(stab),
    riser: freeze(riser),
    crash: freeze(crash),
  }),
  lead: freeze(lead),
});

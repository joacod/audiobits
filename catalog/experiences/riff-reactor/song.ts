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
// Helpers compile named pitches to numeric semitone positions for scheduling.
// tier is the minimum intensity at which a band event plays: 0 is the base
// arrangement, 1 adds harmony and lift, 2 thickens everything.
// The lead is the part the player performs; it is never scheduled by itself.
//
// Form: intro (bars 1-2), verse (3-12), chorus (13-20), break (21-24),
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
  ...([E, C] as const),
  ...([E, C, G, D, E, C, G, D, C, D] as const),
  ...([C, G, D, E, C, G, D, E] as const),
  ...([A, A, C, B] as const),
  ...([C, G, D, E, C, G, D, E] as const),
];
type Section = "intro" | "verse" | "chorus" | "break";
const sectionOf = (bar: number): Section =>
  bar < 2
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
    // A short picked invitation, then the player answers. No repeated count-in.
    hit(kick, at, 0.78);
    if (bar === 1) hit(snare, at + 3, 0.58);
    for (const beat of [0, 1.5, 2.5, 3.5])
      hit(hat, at + beat, beat === 0 ? 0.5 : 0.32);
    hit(bass, at, 0.78, 0, root);
    hit(bass, at + 2.5, 0.6, 0, transpose(root, 7));
    hit(pad, at, 0.48, 0, root, 4);
    const invitation: Phrase =
      bar === 0
        ? [
            [0, 0.75, "E4", 0.74],
            [1, 0.5, "G4", 0.6],
            [2.5, 1, "B4", 0.68],
          ]
        : [
            [0, 1, "G4", 0.68],
            [1.5, 0.5, "E4", 0.56],
            [2.5, 0.75, "D4", 0.6],
          ];
    arp.push(
      ...phrase(invitation, at).map((note) => ({ ...note, tier: 0 as const })),
    );
    continue;
  }
  // Give the opening motif space at every intensity. The full rhythm section
  // joins as the lead develops its answer.
  if (section === "verse" && bar < 6) {
    if (bar === 2) hit(crash, at, 0.65);
    for (let beat = 0; beat < 4; beat++) {
      hit(kick, at + beat, beat ? 0.8 : 0.9);
      hit(hat, at + beat, 0.55);
      hit(bass, at + beat, beat ? 0.75 : 0.9, 0, root);
      if (bar >= 4) hit(hat, at + beat + 0.5, 0.35);
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
    const tones = [12, 7, third, 7];
    for (let step = 0; step < 4; step++)
      hit(
        arp,
        at + step,
        step % 2 ? 0.4 : 0.52,
        0,
        transpose(root, 24 + tones[step]),
      );
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
  for (const beat of chorus ? [0, 1.5, 2, 2.75] : [0, 1.5, 2.5])
    hit(kick, at + beat, beat === 0 ? 0.92 : 0.75);
  hit(kick, at + 0.75, 0.6, 2);
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
  // Root, fifth, octave and a step into the next chord, with breathing room.
  const nextRoot = roots[(bar + 1) % roots.length];
  for (const [beat, pitch, strength] of [
    [0, root, 0.9],
    [0.75, root, 0.62],
    [1.5, transpose(root, 7), 0.72],
    [2.5, root, 0.8],
    [3.5, turnaround ? nextRoot : transpose(root, 12), 0.64],
  ] as const)
    hit(bass, at + beat, strength, 0, pitch);
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
  const tones = chorus ? [12, 7, third, 7] : [0, third, 7, 12];
  for (let step = 0; step < 4; step++)
    hit(
      arp,
      at + step + 0.5,
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

/** Lead phrases: a question, an answer, then a recognisable chorus hook. */
// Gaps are intentional breaths. Dynamics belong to the phrase, not a flat grid.
const opening: Phrase[] = [
  [
    [0, 1, "E4", 0.84],
    [1.5, 0.5, "G4", 0.7],
    [2.5, 1, "B4", 0.88],
  ],
  [
    [0, 1.5, "G4", 0.82],
    [2, 0.5, "E4", 0.68],
    [3, 0.75, "D4", 0.72],
  ],
  [
    [0, 1, "G4", 0.86],
    [1.5, 0.5, "A4", 0.72],
    [2.5, 1, "B4", 0.9],
  ],
  [
    [0, 1, "A4", 0.84],
    [1, 0.5, "F#4", 0.7],
    [2, 1.5, "E4", 0.78],
  ],
];
const verse: Phrase[] = [
  [
    [0, 0.75, "E4", 0.84],
    [1, 0.5, "G4", 0.72],
    [1.75, 0.75, "B4", 0.86],
    [3, 0.75, "A4", 0.7],
  ],
  [
    [0, 1, "G4", 0.84],
    [1.5, 0.5, "E4", 0.7],
    [2.5, 0.5, "G4", 0.74],
    [3.25, 0.5, "A4", 0.78],
  ],
  [
    [0, 1.5, "B4", 0.9],
    [1.75, 0.5, "A4", 0.72],
    [2.5, 0.5, "G4", 0.76],
    [3.25, 0.5, "D4", 0.66],
  ],
  [
    [0, 1, "F#4", 0.84],
    [1.5, 0.5, "A4", 0.72],
    [2.5, 1, "D5", 0.88],
  ],
  [
    [0, 1, "E5", 0.9],
    [1.25, 0.5, "D5", 0.7],
    [2, 0.75, "B4", 0.8],
    [3, 0.75, "G4", 0.72],
  ],
  [
    [0, 0.75, "A4", 0.8],
    [1, 0.5, "B4", 0.74],
    [2, 0.75, "D5", 0.86],
    [3, 0.75, "F#5", 0.9],
  ],
];
const chorus: Phrase[] = [
  [
    [0, 1.25, "E5", 0.94],
    [1.5, 0.5, "D5", 0.76],
    [2.25, 0.75, "C5", 0.84],
    [3.25, 0.5, "E5", 0.78],
  ],
  [
    [0, 1.5, "D5", 0.9],
    [2, 0.5, "B4", 0.74],
    [3, 0.75, "G4", 0.82],
  ],
  [
    [0, 1, "A4", 0.9],
    [1.25, 0.5, "B4", 0.72],
    [2, 1, "D5", 0.88],
    [3.25, 0.5, "F#5", 0.8],
  ],
  [
    [0, 1.5, "E5", 0.94],
    [2, 0.5, "D5", 0.74],
    [2.75, 0.5, "B4", 0.78],
    [3.5, 0.5, "G4", 0.7],
  ],
];
const chorusTurn: Phrase = [
  [0, 1, "G4", 0.88],
  [1.5, 0.5, "B4", 0.78],
  [2.5, 1.25, "E5", 0.94],
];
const breakdown: Phrase[] = [
  [
    [0, 1.5, "C5", 0.76],
    [2, 0.5, "B4", 0.62],
    [3, 0.75, "A4", 0.7],
  ],
  [
    [0.5, 1, "E4", 0.7],
    [2, 1.5, "A4", 0.8],
  ],
  [
    [0, 1.5, "G4", 0.76],
    [2.5, 1, "E4", 0.66],
  ],
  [
    [0, 1, "F#4", 0.76],
    [1.5, 0.5, "D#4", 0.66],
    [2.5, 1, "B4", 0.84],
  ],
];
const finalChorus: Phrase[] = [
  [
    [0, 1, "E5", 0.96],
    [1.25, 0.5, "G5", 0.82],
    [2, 0.5, "E5", 0.86],
    [2.75, 0.5, "D5", 0.76],
    [3.5, 0.5, "C5", 0.8],
  ],
  [
    [0, 1, "D5", 0.92],
    [1.25, 0.5, "B4", 0.76],
    [2, 0.5, "G4", 0.8],
    [2.75, 0.5, "A4", 0.74],
    [3.5, 0.5, "B4", 0.84],
  ],
  [
    [0, 1, "A4", 0.9],
    [1.25, 0.5, "B4", 0.76],
    [2, 0.5, "D5", 0.86],
    [2.75, 0.5, "E5", 0.8],
    [3.5, 0.5, "F#5", 0.88],
  ],
  [
    [0, 1, "G5", 0.96],
    [1.25, 0.5, "F#5", 0.8],
    [2, 0.5, "E5", 0.86],
    [2.75, 0.5, "D5", 0.74],
    [3.5, 0.5, "B4", 0.8],
  ],
];
const leadBars: Phrase[] = [
  ...opening,
  ...verse,
  ...chorus,
  ...chorus.slice(0, 3),
  chorusTurn,
  ...breakdown,
  ...chorus,
  ...finalChorus,
];
const lead: RiffNote[] = leadBars.flatMap((notes, index) =>
  phrase(notes, (index + 2) * 4),
);
lead.push(...phrase([[128, 2, "E5", 0.92]]));

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

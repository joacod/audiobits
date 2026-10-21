import type { RiffNote, RiffSong } from "./controller";

// "Reactor Core": an original 60-second synth-rock track in E minor at 128 BPM.
// Composition data only. Beats count from the first downbeat; notes are MIDI
// numbers. tier is the minimum intensity at which a band event plays, so tier
// 0 is the base arrangement, 1 adds harmony and lift, 2 thickens everything.
// The lead is the part the player performs; it is never scheduled by itself.
//
// Form: intro (bars 1-4), verse (5-12), chorus (13-20), break (21-24),
// final chorus (25-32), and a closing downbeat on beat 128.

const E = 40,
  C = 36,
  D = 38,
  G = 43,
  A = 45,
  B = 35;
const minor = new Set([E, A]);
/** Chord root per bar, in the bass register. */
const roots = [
  ...[E, E, E, E],
  ...[E, E, C, D, E, E, C, D],
  ...[C, G, D, E, C, G, D, E],
  ...[A, A, C, B],
  ...[C, G, D, E, C, G, D, E],
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
  note?: number,
  length = 0.25,
) => track.push({ beat, length, velocity, tier, ...(note ? { note } : {}) });

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
      hit(arp, at + step / 2, 0.55, 0, root + 24 + tones[step]);
    if (bar === 23) {
      hit(riser, at, 1, 0);
      for (const beat of [3, 3.25, 3.5, 3.75])
        hit(snare, at + beat, 0.45 + (beat - 3) * 0.6, 1);
    }
    continue;
  }
  const chorus = section === "chorus";
  if (bar === 12 || bar === 24 || bar === 4) hit(crash, at, 0.9);
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
  const octave = root + 12;
  for (const beat of [1.75, 3.75])
    hit(bass, at + beat, 0.6, 1, octave <= 55 ? octave : root);
  hit(pad, at, chorus ? 0.8 : 0.6, 0, root, 4);
  const tones = chorus
    ? [12, 7, 12 + third, 7, 19, 7, 12 + third, 7]
    : [0, 7, 12, 7, third, 7, 12, 7];
  for (let step = 0; step < 8; step++)
    hit(arp, at + step / 2, chorus ? 0.6 : 0.5, 1, root + 24 + tones[step]);
  // Syncopated power-chord chugs: the rhythm part. Base in the chorus,
  // harmony tier in the verse, and extra pushes at the top tier.
  for (const beat of [0, 0.75, 1.5, 2.5, 3.25])
    hit(stab, at + beat, chorus ? 0.75 : 0.6, chorus ? 0 : 1, root + 12);
  for (const beat of [2, 3.75]) hit(stab, at + beat, 0.5, 2, root + 12);
  if (bar === 11) hit(riser, at, 0.9, 1);
}
// The closing downbeat rings the whole band out.
hit(kick, 128, 1);
hit(crash, 128, 1);
hit(bass, 128, 1, 0, E);
hit(pad, 128, 0.9, 0, E, 4);
hit(stab, 128, 0.85, 0, E + 12);

/** Lead phrases as [beat within the bar, length in beats, MIDI note]. */
type Phrase = readonly (readonly [number, number, number])[];
const verse: Phrase[] = [
  [
    [0, 0.5, 64],
    [0.5, 0.5, 67],
    [1, 0.5, 69],
    [1.5, 1, 71],
    [2.5, 0.5, 69],
    [3, 0.5, 67],
    [3.5, 0.5, 69],
  ],
  [
    [0, 1.5, 71],
    [1.5, 0.5, 74],
    [2, 1, 71],
    [3, 0.5, 69],
    [3.5, 0.5, 67],
  ],
  [
    [0, 0.5, 64],
    [0.5, 0.5, 67],
    [1, 1, 72],
    [2, 0.5, 71],
    [2.5, 0.5, 67],
    [3, 1, 64],
  ],
  [
    [0, 0.5, 66],
    [0.5, 0.5, 69],
    [1, 1, 74],
    [2, 0.5, 72],
    [2.5, 0.5, 71],
    [3, 1, 69],
  ],
];
const verseLift: Phrase = [
  [0, 0.5, 66],
  [0.5, 0.5, 69],
  [1, 0.5, 74],
  [1.5, 0.5, 76],
  [2, 2, 78],
];
const chorus: Phrase[] = [
  [
    [0, 1.5, 79],
    [1.5, 0.5, 76],
    [2, 1, 79],
    [3, 1, 81],
  ],
  [
    [0, 1.5, 83],
    [1.5, 0.5, 81],
    [2, 1, 79],
    [3, 1, 74],
  ],
  [
    [0, 1, 78],
    [1, 1, 81],
    [2, 0.5, 78],
    [2.5, 0.5, 76],
    [3, 1, 74],
  ],
  [
    [0, 2, 76],
    [2, 0.5, 71],
    [2.5, 0.5, 74],
    [3, 1, 76],
  ],
];
const chorusTurn: Phrase = [
  [0, 1, 76],
  [1, 0.5, 79],
  [1.5, 0.5, 78],
  [2, 2, 76],
];
const finalTurn: Phrase = [
  [0, 1, 79],
  [1, 1, 81],
  [2, 2, 83],
];
const breakdown: Phrase[] = [
  [
    [0, 2, 69],
    [2, 1, 72],
    [3, 1, 71],
  ],
  [
    [0, 3, 69],
    [3, 1, 76],
  ],
  [
    [0, 2, 79],
    [2, 2, 76],
  ],
  [
    [0, 2, 78],
    [2, 1, 75],
    [3, 1, 71],
  ],
];
const leadBars: Phrase[] = [
  ...verse,
  ...verse.slice(0, 3),
  verseLift,
  ...chorus,
  ...chorus.slice(0, 3),
  chorusTurn,
  ...breakdown,
  ...chorus,
  ...chorus.slice(0, 3),
  finalTurn,
];
const lead: RiffNote[] = leadBars.flatMap((phrase, index) =>
  phrase.map(([beat, length, note]) => ({
    beat: (index + 4) * 4 + beat,
    length,
    note,
    velocity: beat === 0 ? 0.95 : 0.85,
  })),
);
lead.push({ beat: 128, length: 2, note: 76, velocity: 1 });

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

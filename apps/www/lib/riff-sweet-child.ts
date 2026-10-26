import type {
  RiffNote,
  RiffSong,
  RiffTrack,
} from "../../../catalog/experiences/riff-reactor/controller";
import {
  phrase,
  noteToMidi,
  transpose,
  type NoteName,
  type Phrase,
} from "../../../catalog/helpers/music";

// Short instrumental arrangement of Sweet Child O' Mine by Guns N' Roses.
// Opening guitar motif with simplified backing and chord-tone responses in the
// verse/chorus. Not a full transcription or the Guitar Hero chart.
// Written in D guitar positions, sounding one semitone lower as on the record.
// Form: count-in (1 bar), intro (8), verse (8), chorus (8), reprise (8), ending (1).
// Reference lesson: https://www.musicradar.com/tuition/guitars/weekend-riff-guns-n-roses-sweet-child-o-mine-intro-riff-601537
const tune = (note: NoteName) => transpose(note, -1);
const band: Partial<Record<RiffTrack, RiffNote[]>> = {};
const lead: RiffNote[] = [];
function add(
  track: "bass" | "stab",
  notes: Phrase,
  at: number,
  tier: 0 | 1 | 2 = 0,
) {
  (band[track] ??= []).push(
    ...phrase(notes, at).map((note) => ({ ...note, tier })),
  );
}
function drums(
  track: "kick" | "snare" | "hat" | "openHat" | "crash",
  hits: readonly (readonly [beat: number, length: number, velocity: number])[],
  at: number,
  tier: 0 | 1 | 2 = 0,
) {
  (band[track] ??= []).push(
    ...hits.map(([beat, length, velocity]) => ({
      beat: at + beat,
      length,
      velocity,
      tier,
    })),
  );
}
function melody(notes: Phrase, at: number) {
  lead.push(
    ...phrase(
      notes.map(([beat, length, notes, velocity]) => [
        beat,
        length,
        typeof notes === "object"
          ? notes.map((note) => transpose(note, -1))
          : transpose(notes, -1),
        velocity,
      ]),
      at,
    ),
  );
}

// Quiet closed hats supply a full bar to see the first notes approaching.
drums(
  "hat",
  [
    [0, 0.1, 0.25],
    [1, 0.1, 0.35],
    [2, 0.1, 0.35],
    [3, 0.1, 0.5],
  ],
  0,
);
const verseRoots: readonly NoteName[] = [
  "D2",
  "D2",
  "C2",
  "C2",
  "G2",
  "G2",
  "D2",
  "D2",
];
const chorusRoots: readonly NoteName[] = [
  "A2",
  "A2",
  "C2",
  "C2",
  "D2",
  "D2",
  "D2",
  "D2",
];
const roots = [...verseRoots, ...verseRoots, ...chorusRoots, ...verseRoots];
for (const [bar, root] of roots.entries()) {
  const at = 4 + bar * 4;
  const intro = bar < 8;
  const riff = intro || bar >= 24;
  const chorus = bar >= 16 && bar < 24;
  if (riff) {
    const first: NoteName = root === "G2" ? "G4" : transpose(root, 24);
    const motif: readonly NoteName[] = [
      first,
      "D5",
      "A4",
      "G4",
      "G5",
      "A4",
      "F#5",
      "A4",
    ];
    melody(
      motif.map((note, step) => [
        step / 2,
        0.46,
        note,
        step % 2 === 0 ? 0.86 : 0.74,
      ]),
      at,
    );
  } else if (chorus) {
    // Simplified instrumental response over A-C-D, rather than synthesized vocals.
    const top = transpose(root, 24);
    melody(
      [
        [0, 0.9, top, 0.88],
        [1, 0.45, transpose(top, 4), 0.78],
        [1.5, 0.9, transpose(top, 7), 0.9],
        [3, 0.8, transpose(top, 4), 0.76],
      ],
      at,
    );
  } else {
    const top = transpose(root, 24);
    melody(
      bar % 2 === 0
        ? [
            [0, 0.9, top, 0.8],
            [1.5, 0.45, transpose(top, 7), 0.72],
            [2.5, 0.9, transpose(top, 12), 0.84],
          ]
        : [
            [0.5, 0.9, transpose(top, 7), 0.78],
            [2, 1.3, transpose(top, 4), 0.72],
          ],
      at,
    );
  }
  const bassRoot = tune(root);
  add(
    "bass",
    [
      [0, 0.5, bassRoot, 0.88],
      [1, 0.5, bassRoot, 0.65],
      [2, 0.5, transpose(bassRoot, 7), 0.75],
      [3, 0.5, bassRoot, 0.78],
    ],
    at,
  );
  const bassTurn = transpose(bassRoot, noteToMidi(bassRoot) + 12 > 55 ? 7 : 12);
  add("bass", [[3.5, 0.25, bassTurn, 0.55]], at, 1);
  drums(
    "kick",
    [
      [0, 0.2, 0.88],
      [2, 0.2, 0.78],
      [2.5, 0.2, 0.62],
    ],
    at,
  );
  drums(
    "snare",
    [
      [1, 0.2, 0.84],
      [3, 0.2, 0.9],
    ],
    at,
  );
  drums(
    "hat",
    Array.from({ length: 8 }, (_, step) => [
      step / 2,
      0.1,
      step % 2 ? 0.36 : 0.55,
    ]),
    at,
  );
  const chord = [
    transpose(bassRoot, 12),
    transpose(bassRoot, 16),
    transpose(bassRoot, 19),
  ];
  add(
    "stab",
    [
      [0, 0.4, chord, 0.7],
      [2, 0.4, chord, 0.6],
    ],
    at,
  );
  add(
    "stab",
    [
      [1.5, 0.4, chord, 0.5],
      [3.5, 0.4, chord, 0.55],
    ],
    at,
    1,
  );
  drums("openHat", [[3.5, 0.15, 0.48]], at, 1);
  drums("kick", [[0.75, 0.2, 0.5]], at, 2);
  drums("snare", [[2.75, 0.1, 0.25]], at, 2);
  if ([4, 8, 16, 24].includes(bar)) drums("crash", [[0, 0.2, 0.7]], at);
  if (bar % 8 === 7)
    drums(
      "snare",
      [
        [3.5, 0.15, 0.5],
        [3.75, 0.15, 0.65],
      ],
      at,
      2,
    );
}
melody([[0, 2, "D5", 0.9]], 132);
drums("kick", [[0, 0.2, 0.9]], 132);
drums("crash", [[0, 0.2, 0.85]], 132);
add("bass", [[0, 1, tune("D2"), 0.9]], 132);
add("stab", [[0, 1, [tune("D3"), tune("F#3"), tune("A3")], 0.8]], 132);

export const sweetChildSong: RiffSong = {
  title: "Sweet Child O’ Mine",
  bpm: 124,
  beatsPerBar: 4,
  bars: 34,
  band,
  lead,
};

import { expect, test, vi } from "vitest";
import type { AudioEngine } from "audiobits";
import {
  createTransport,
  noteToHz,
  noteToMidi,
  phrase,
  transpose,
  type Pitch,
} from "../catalog/experiences/riff-reactor/music";
import { createInstrument } from "../catalog/experiences/riff-reactor/instrument";
import { riffInstruments } from "../catalog/experiences/riff-reactor/instruments";

test("scientific pitch names use middle C, concert A and enharmonic octave boundaries", () => {
  expect(noteToMidi("C4")).toBe(60);
  expect(noteToHz("A4")).toBe(440);
  expect(noteToHz("A3")).toBe(220);
  expect(noteToMidi("Bb3")).toBe(noteToMidi("A#3"));
  expect(noteToMidi("B#3")).toBe(60);
  expect(noteToMidi("Cb4")).toBe(59);
  expect(noteToMidi("C-1")).toBe(0);
  expect(noteToMidi("G9")).toBe(127);
  expect(transpose("Bb3", 12)).toBe("A#4");
  expect(transpose("C4", -1)).toBe("B3");
  for (let midi = 0; midi <= 127; midi++)
    expect(noteToMidi(transpose(midi, 0))).toBe(midi);
});

test("phrases preserve rests, chords, dynamics and fractional beats on the audio clock", () => {
  const notes = phrase(
    [
      [2, 1.5, "G4", 0.9],
      [0, 1 / 3, ["C4", "E4"], 0.6],
      [1 / 3, 1 / 3, "D4", 0],
    ],
    4,
  );
  expect(notes).toEqual([
    { beat: 4, length: 1 / 3, note: 60, velocity: 0.6 },
    { beat: 4, length: 1 / 3, note: 64, velocity: 0.6 },
    { beat: 4 + 1 / 3, length: 1 / 3, note: 62, velocity: 0 },
    { beat: 6, length: 1.5, note: 67, velocity: 0.9 },
  ]);
  const clock = createTransport(120, 10);
  expect(clock.timeAt(notes[0].beat)).toBe(12);
  expect(clock.timeAt(notes[3].beat + notes[3].length)).toBe(13.75);
  expect(clock.beatAt(clock.timeAt(4 + 1 / 3))).toBeCloseTo(4 + 1 / 3);
  expect(phrase([[0, 1, "C4"]])[0].velocity).toBe(0.8);
});

test("malformed pitch, rhythm and tempo fail before playback", () => {
  for (const note of [
    "H4",
    "C4junk",
    "C#",
    "C4.5",
    "C10",
    "Cb-1",
    NaN,
    60.5,
    128,
  ])
    expect(() => noteToMidi(note as Pitch)).toThrow(RangeError);
  expect(() => transpose("C4", 0.5)).toThrow(RangeError);
  expect(() => phrase([[0, 0, "C4"]])).toThrow(RangeError);
  expect(() => phrase([[-1, 1, "C4"]])).toThrow(RangeError);
  expect(() => phrase([[0, 1, "C4", 1.1]])).toThrow(RangeError);
  expect(() => phrase([[0, 1, "C4"]], Infinity)).toThrow(RangeError);
  for (const bpm of [0, -120, NaN, Infinity])
    expect(() => createTransport(bpm, 0)).toThrow(RangeError);
});

test("instruments map musical inputs and preserve the native voice and host ownership", () => {
  const voice = { stop: vi.fn() };
  const play = vi.fn(() => voice);
  const dispose = vi.fn();
  const audio = {
    sound: vi.fn(() => ({ play, dispose })),
  } as unknown as AudioEngine;
  const bass = createInstrument(audio, riffInstruments.bass);
  const played = bass.play({
    note: "E2",
    velocity: 0.7,
    at: 12,
    pan: -0.2,
    seed: 42,
  });
  expect(play).toHaveBeenCalledWith({
    at: 12,
    pan: -0.2,
    seed: 42,
    parameters: { frequency: noteToHz("E2"), velocity: 0.7 },
  });
  expect(played).toBe(voice);
  played.stop();
  expect(voice.stop).toHaveBeenCalledOnce();
  expect(() => bass.play({ velocity: NaN })).toThrow(RangeError);
  const kick = createInstrument(audio, riffInstruments.kick);
  expect(() => kick.play({ note: "C4" })).toThrow(TypeError);
  kick.play({ velocity: 0.9 });
  expect(play).toHaveBeenLastCalledWith({ parameters: { velocity: 0.9 } });
  bass.dispose();
  expect(dispose).toHaveBeenCalledOnce();
});

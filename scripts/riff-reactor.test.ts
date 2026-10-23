import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import ts from "typescript";
import { validateRecipe, type AudioEngine, type Recipe } from "audiobits";
import * as recipes from "../catalog/experiences/riff-reactor/recipe";
import {
  bandEvents,
  collectWindow,
  createRiff,
  createTransport,
  lookahead,
  midiToHz,
  preroll,
  refillPeriod,
  totalLatency,
  type BandEvent,
  type RiffTier,
  type RiffInstruments,
} from "../catalog/experiences/riff-reactor/controller";
import { riffReactorSong as song } from "../catalog/experiences/riff-reactor/song";
import {
  riffVoiceLimit,
  riffVoicesPerSound,
} from "../catalog/experiences/riff-reactor/host";
import {
  compile,
  effectTail,
  MAX_DELAY_TAIL,
} from "../packages/audiobits/src/compiler/plan";
import { checkNyquist } from "../packages/audiobits/src/compiler/graph";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};
const recipeFor: Record<BandEvent["track"], Recipe> = {
  kick: recipes.riffKick,
  snare: recipes.riffSnare,
  hat: recipes.riffHat,
  openHat: recipes.riffOpenHat,
  bass: recipes.riffBass,
  pad: recipes.riffPad,
  arp: recipes.riffArp,
  stab: recipes.riffStab,
  riser: recipes.riffRiser,
  crash: recipes.riffCrash,
};
const controlsOf = (
  recipe: Recipe,
  event: { note?: number; velocity?: number },
) => {
  const declared = recipe.parameters ?? {};
  return {
    ...("velocity" in declared ? { velocity: event.velocity ?? 0.8 } : {}),
    ...("frequency" in declared && event.note !== undefined
      ? { frequency: midiToHz(event.note) }
      : {}),
  };
};

function setup(presets: Partial<RiffInstruments> = {}) {
  const clock = { currentTime: 0, outputLatency: 0.02, baseLatency: 0.01 };
  const sounds = new Map<Recipe, ReturnType<typeof fakeSound>>();
  type FakeBus = {
    name: string;
    parent?: FakeBus;
    setGainDb: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };
  const buses: FakeBus[] = [];
  let listener!: (state: string) => void;
  const unsubscribe = vi.fn();
  type Options = {
    at?: number;
    bus: FakeBus;
    parameters: Record<string, number>;
  };
  function fakeSound(recipe: Recipe) {
    const voices: {
      state: "active" | "stopping" | "ended";
      options: Options;
      bookedAt: number;
      stoppedAt?: number;
      stop: ReturnType<typeof vi.fn>;
      ended: Promise<void>;
      finish(): void;
    }[] = [];
    const sound = {
      recipe,
      voices,
      dispose: vi.fn(),
      play: vi.fn((options: Options) => {
        // The real engine rejects past start times.
        if (options.at !== undefined && options.at < clock.currentTime)
          throw new Error("at is in the past");
        let done!: () => void;
        const voice = {
          state: "active" as "active" | "stopping" | "ended",
          options,
          bookedAt: clock.currentTime,
          stoppedAt: undefined as number | undefined,
          stop: vi.fn(() => {
            voice.state = "stopping";
            voice.stoppedAt = clock.currentTime;
          }),
          set: vi.fn(),
          ended: new Promise<void>((resolve) => {
            done = resolve;
          }),
          finish() {
            voice.state = "ended";
            done();
          },
        };
        voices.push(voice);
        return voice;
      }),
    };
    return sound;
  }
  const audio = {
    state: "running",
    native: { context: clock },
    sound(recipe: Recipe) {
      const sound = fakeSound(recipe);
      sounds.set(recipe, sound);
      return sound;
    },
    bus(name: string, parent?: FakeBus) {
      const bus = { name, parent, setGainDb: vi.fn(), dispose: vi.fn() };
      buses.push(bus);
      return bus;
    },
    subscribe(fn: typeof listener) {
      listener = fn;
      return unsubscribe;
    },
  } as unknown as AudioEngine & { state: string };
  const intensities: [RiffTier, number][] = [];
  const phases: string[] = [];
  const finished = vi.fn();
  const riff = createRiff(
    audio,
    song,
    {
      phase: (value) => phases.push(value),
      intensity: (tier, at) => intensities.push([tier, at]),
      finished,
    },
    presets,
  );
  const of = (recipe: Recipe) => sounds.get(recipe)!;
  const advance = async (seconds: number) => {
    // Refill timers fire as the audio clock moves, in refill-sized steps.
    for (let left = seconds; left > 1e-9; left -= refillPeriod) {
      const step = Math.min(refillPeriod, left);
      clock.currentTime += step;
      await vi.advanceTimersByTimeAsync(step * 1000);
    }
  };
  const band = () =>
    (Object.keys(recipeFor) as BandEvent["track"][]).flatMap((track) =>
      of(recipeFor[track]).voices.map((voice) => ({ track, ...voice })),
    );
  return {
    riff,
    audio,
    clock,
    buses,
    phases,
    intensities,
    finished,
    unsubscribe,
    advance,
    of,
    band,
    lead: () => of(recipes.riffLead),
    interrupt: (state = "interrupted") => listener(state),
  };
}

test("the installed recipe module exports only valid recipes that compile at extrema", () => {
  for (const recipe of Object.values(recipes)) {
    expect(validateRecipe(recipe).ok).toBe(true);
    expect(validateRecipe(JSON.parse(JSON.stringify(recipe))).ok).toBe(true);
    for (const edge of ["min", "default", "max"] as const) {
      const controls = Object.fromEntries(
        Object.entries("parameters" in recipe ? recipe.parameters : {}).map(
          ([name, parameter]) => [name, parameter[edge]],
        ),
      );
      const plan = compile(recipe, controls, 0);
      expect(compile(recipe, controls, 0)).toEqual(plan);
      for (const rate of [22050, 32000, 44100, 48000])
        expect(() => checkNyquist(plan, rate)).not.toThrow();
    }
  }
});

test("every composed note is inside its recipe's parameter range", () => {
  for (const event of bandEvents(song))
    expect(() =>
      compile(
        recipeFor[event.track],
        controlsOf(recipeFor[event.track], event),
      ),
    ).not.toThrow();
  for (const note of song.lead)
    expect(() =>
      compile(recipes.riffLead, controlsOf(recipes.riffLead, note)),
    ).not.toThrow();
  // About 60 seconds: 32 bars of 4/4 at 128 BPM, then a closing downbeat.
  expect((song.bars * song.beatsPerBar * 60) / song.bpm).toBe(60);
  expect(song.lead.length).toBeGreaterThan(100);
  for (let i = 0; i < song.lead.length - 1; i++) {
    const note = song.lead[i];
    expect(note.length).toBeGreaterThan(0);
    expect(note.beat + note.length).toBeLessThanOrEqual(song.lead[i + 1].beat);
  }
});

test("the opening accompaniment leaves room for the lead even at top intensity", () => {
  const events = bandEvents(song);
  const opening = events.filter(({ beat }) => beat >= 16 && beat < 32);
  expect(new Set(opening.map(({ track }) => track))).toEqual(
    new Set(["kick", "snare", "hat", "bass", "pad", "crash"]),
  );
  expect(opening.every(({ tier }) => tier === 0)).toBe(true);
  expect(
    opening
      .filter(({ track }) => track === "bass")
      .every(({ beat }) => Number.isInteger(beat)),
  ).toBe(true);
  expect(
    events.some(
      ({ beat, track }) => beat >= 32 && beat < 48 && track === "arp",
    ),
  ).toBe(true);
});

test("sound source imports only the runtime and its own sound files", () => {
  const base = "catalog/experiences/riff-reactor";
  const allowed: Record<string, string[]> = {
    "recipe.ts": ["audiobits"],
    "controller.ts": ["audiobits", "./instrument", "./instruments", "./music"],
    "instrument.ts": ["audiobits", "./music"],
    "instruments.ts": ["./recipe"],
    "music.ts": [],
    "song.ts": ["./controller", "./music"],
  };
  for (const [file, specifiers] of Object.entries(allowed)) {
    const source = readFileSync(`${base}/${file}`, "utf8");
    const imports = ts
      .preProcessFile(source, true, true)
      .importedFiles.map((entry) => entry.fileName);
    for (const specifier of imports) expect(specifiers).toContain(specifier);
    expect(source).not.toMatch(/riff-chart|riff-stage|apps\/www|score|judge/i);
  }
});

test("lookahead windows schedule each band event exactly once", () => {
  const events = bandEvents(song);
  const seen: BandEvent[] = [];
  let cursor = 0;
  let beat = -1;
  // Irregular windows, including empty and very long ones.
  for (const step of [0, 0.01, 0.3, 0, 2.5, 0.07, 9, 0.5])
    for (let i = 0; i < 40; i++) {
      beat += step;
      const window = collectWindow(events, cursor, beat);
      for (const event of window.due) expect(event.beat).toBeLessThan(beat);
      seen.push(...window.due);
      cursor = window.cursor;
    }
  const rest = collectWindow(events, cursor, Infinity);
  seen.push(...rest.due);
  expect(seen).toEqual(events);
  expect(new Set(seen).size).toBe(events.length);
});

test("the band plays every event once on its exact audio-clock time, booked only within the lookahead", async () => {
  const s = setup();
  s.riff.setIntensity(2);
  s.clock.currentTime = 3.21;
  const transport = s.riff.start()!;
  expect(transport.origin).toBeCloseTo(3.21 + preroll);
  // The lead is never played by the controller on its own.
  await s.advance(70);
  expect(s.lead().play).not.toHaveBeenCalled();
  const played = s.band();
  const events = bandEvents(song);
  expect(played.length).toBe(events.length);
  const expected = createTransport(song.bpm, transport.origin);
  played.forEach((voice) => {
    const at = voice.options.at;
    if (at === undefined)
      throw new Error("Band voices must have scheduled start times");
    const event = events.find(
      (candidate) =>
        candidate.track === voice.track &&
        expected.timeAt(candidate.beat) === at,
    );
    // No drift: the 64th bar is as exact as the first.
    expect(event, `${voice.track} at ${at}`).toBeDefined();
    expect(at - voice.bookedAt).toBeLessThanOrEqual(
      lookahead + refillPeriod + 1e-9,
    );
    expect(at).toBeGreaterThanOrEqual(voice.bookedAt);
  });
  // The song finishes on its own and releases its session.
  expect(s.riff.phase).toBe("idle");
  expect(s.finished).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
  for (const bus of s.buses.filter((bus) => !bus.parent))
    expect(bus.dispose).toHaveBeenCalledTimes(1);
});

test("intensity changes only at bar starts", async () => {
  const s = setup();
  const transport = s.riff.start()!;
  // Mid-bar in the developed verse (bar 9, beat 2.6).
  await s.advance(transport.timeAt(34.6) - s.clock.currentTime);
  s.riff.setIntensity(2);
  expect(s.intensities.at(-1)).toEqual([2, transport.timeAt(36)]);
  expect(s.riff.intensity).toEqual({ current: 0, pending: 2 });
  await s.advance(transport.timeAt(37.3) - s.clock.currentTime);
  expect(s.riff.intensity).toEqual({ current: 2, pending: undefined });
  s.riff.setIntensity(0);
  expect(s.intensities.at(-1)).toEqual([0, transport.timeAt(40)]);
  await s.advance(transport.timeAt(48) - s.clock.currentTime);
  const tierOf = (voice: {
    track: BandEvent["track"];
    options: { at?: number };
  }) =>
    bandEvents(song).find(
      (event) =>
        event.track === voice.track &&
        transport.timeAt(event.beat) === voice.options.at,
    )!;
  const lifted = s
    .band()
    .map(tierOf)
    .filter((event) => event.tier > 0);
  expect(lifted.length).toBeGreaterThan(0);
  for (const event of lifted) {
    expect(event.beat).toBeGreaterThanOrEqual(36);
    expect(event.beat).toBeLessThan(40);
  }
  // Every top-tier event of the lifted bar played.
  expect(lifted.length).toBe(
    bandEvents(song).filter(
      (event) => event.tier > 0 && event.beat >= 36 && event.beat < 40,
    ).length,
  );
  s.riff.dispose();
});

test("a hit plays the charted pitch now until its end; a miss leaves a gap while the band keeps its level", async () => {
  const s = setup();
  const transport = s.riff.start()!;
  const gains = s.buses.map((bus) => bus.setGainDb.mock.calls.length);
  const [first, second, third] = song.lead;
  // A slightly late hit still plays immediately, never quantized.
  await s.advance(transport.timeAt(first.beat) + 0.03 - s.clock.currentTime);
  const timeline = s.riff.performLead(0)!;
  expect(timeline.at).toBe(s.clock.currentTime);
  const voice = s.lead().voices[0];
  expect(voice.options.at).toBeUndefined();
  expect(voice.options.parameters.frequency).toBeCloseTo(midiToHz(first.note!));
  expect(voice.options.bus.name).toMatch(/-lead$/);
  await s.advance(timeline.end + 0.05 - s.clock.currentTime);
  expect(voice.stop).toHaveBeenCalledTimes(1);
  expect(Math.abs(voice.stoppedAt! - timeline.end)).toBeLessThanOrEqual(
    refillPeriod / 2 + 1e-9,
  );
  // The second note is missed: nothing plays for it and the band continues.
  const bandBefore = s.band().length;
  s.riff.choke();
  expect(s.of(recipes.riffChoke).play).toHaveBeenCalledTimes(1);
  await s.advance(
    transport.timeAt(second.beat + second.length) - s.clock.currentTime,
  );
  expect(s.lead().play).toHaveBeenCalledTimes(1);
  expect(s.band().length).toBeGreaterThan(bandBefore);
  expect(s.buses.map((bus) => bus.setGainDb.mock.calls.length)).toEqual(gains);
  // A note whose end has passed cannot be performed late.
  expect(s.riff.performLead(1)).toBeUndefined();
  // Monophonic: a new hit stops the held note.
  await s.advance(transport.timeAt(third.beat) - s.clock.currentTime);
  s.riff.performLead(2);
  s.riff.performLead(3);
  expect(s.lead().voices[1].stop).toHaveBeenCalledTimes(1);
  expect(s.lead().voices[2].stop).not.toHaveBeenCalled();
  s.riff.dispose();
});

test("a stale refill or voice ending after a replay changes nothing", async () => {
  const s = setup();
  let transport = s.riff.start()!;
  await s.advance(transport.timeAt(song.lead[0].beat) - s.clock.currentTime);
  s.riff.performLead(0);
  const oldLead = s.lead().voices[0];
  // Keep the old session's refill timer alive past stop().
  const clear = vi
    .spyOn(globalThis, "clearTimeout")
    .mockImplementation(() => {});
  s.riff.stop();
  clear.mockRestore();
  const before = new Set(s.band().map((voice) => voice.options));
  transport = s.riff.start()!;
  const fresh = s.buses.slice(-6);
  await s.advance(transport.timeAt(song.lead[0].beat) - s.clock.currentTime);
  const timeline = s.riff.performLead(0)!;
  oldLead.finish();
  await settle();
  await s.advance(timeline.end + 0.05 - s.clock.currentTime);
  // The fresh held note still ends at its own end.
  expect(s.lead().voices[1].stop).toHaveBeenCalledTimes(1);
  const replayed = s.band().filter((voice) => !before.has(voice.options));
  // Only the fresh session schedules, once per event, on its own buses.
  expect(new Set(replayed.map((v) => `${v.track}@${v.options.at}`)).size).toBe(
    replayed.length,
  );
  for (const voice of replayed) expect(fresh).toContain(voice.options.bus);
  const due = (until: number) =>
    bandEvents(song).filter(
      (event) => event.tier === 0 && transport.timeAt(event.beat) < until,
    ).length;
  expect(replayed.length).toBeGreaterThanOrEqual(due(s.clock.currentTime));
  expect(replayed.length).toBeLessThanOrEqual(
    due(s.clock.currentTime + lookahead),
  );
  for (const bus of fresh) expect(bus.dispose).not.toHaveBeenCalled();
  // The stale timer fired and did not re-arm: one refill chain remains.
  expect(vi.getTimerCount()).toBe(1);
  s.riff.dispose();
});

test("stop and dispose are repeatable and nothing is scheduled after dispose", async () => {
  const s = setup();
  s.riff.start();
  await s.advance(2);
  s.riff.stop();
  s.riff.stop();
  expect(s.riff.phase).toBe("idle");
  s.riff.start();
  await s.advance(1);
  s.riff.dispose();
  s.riff.dispose();
  s.riff.stop();
  const played = s.band().length;
  await s.advance(5);
  expect(s.band().length).toBe(played);
  expect(vi.getTimerCount()).toBe(0);
  for (const bus of s.buses.filter((bus) => !bus.parent))
    expect(bus.dispose).toHaveBeenCalledTimes(1);
  expect(s.unsubscribe).toHaveBeenCalledTimes(1);
  for (const recipe of Object.values(recipes))
    expect(s.of(recipe).dispose).toHaveBeenCalledTimes(1);
  expect(s.riff.start()).toBeUndefined();
  expect(s.riff.performLead(0)).toBeUndefined();
  expect(s.phases.at(-1)).toBe("idle");
});

test("interruption stops the song; start requires a running engine", async () => {
  const s = setup();
  s.riff.start();
  await s.advance(0.5);
  s.interrupt();
  expect(s.riff.phase).toBe("idle");
  expect(vi.getTimerCount()).toBe(1); // the retiring bus cleanup only
  s.audio.state = "suspended";
  expect(s.riff.start()).toBeUndefined();
  expect(s.riff.latency).toBe(0);
  s.audio.state = "running";
  expect(s.riff.latency).toBeCloseTo(0.03, 12);
  s.riff.dispose();
});

test("latency is base plus output latency, either missing or zero", () => {
  expect(totalLatency({ baseLatency: 0.01, outputLatency: 0.02 })).toBeCloseTo(
    0.03,
    12,
  );
  expect(totalLatency({ baseLatency: 0.01 })).toBe(0.01);
  expect(totalLatency({ outputLatency: 0.02 })).toBe(0.02);
  expect(totalLatency({ baseLatency: 0.01, outputLatency: 0 })).toBe(0.01);
  expect(totalLatency({ baseLatency: 0, outputLatency: 0.02 })).toBe(0.02);
  expect(totalLatency({})).toBe(0);
  expect(totalLatency({ baseLatency: Number.NaN, outputLatency: -1 })).toBe(0);
});

test("peak density never reaches the global voice limit", () => {
  // Worst case: top tier, every lead note hit, a stray choke on every note.
  // Booked voices count as active from booking, up to one lookahead early.
  const transport = createTransport(song.bpm, 0);
  const spans = new Map<string, [number, number][]>();
  const add = (sound: string, start: number, end: number) =>
    spans.set(sound, [...(spans.get(sound) ?? []), [start, end]]);
  for (const event of bandEvents(song)) {
    const recipe = recipeFor[event.track];
    const at = transport.timeAt(event.beat);
    add(
      event.track,
      at - lookahead - refillPeriod,
      at + compile(recipe, controlsOf(recipe, event)).lifetime,
    );
  }
  const lead = compile(recipes.riffLead, { frequency: 330 });
  const leadTail =
    Math.max(...lead.layers.map((layer) => layer.layer.envelope.release)) +
    Math.min(MAX_DELAY_TAIL, effectTail(lead.effectChain)) +
    0.05;
  const choke = compile(recipes.riffChoke).lifetime;
  for (const note of song.lead) {
    const at = transport.timeAt(note.beat);
    add("lead", at, transport.timeAt(note.beat + note.length) + leadTail);
    add("choke", at, at + choke);
  }
  const perSound = riffVoicesPerSound;
  const concurrent = (list: [number, number][], t: number) =>
    list.filter(([start, end]) => start <= t && t < end).length;
  const times = [...spans.values()].flat().map(([start]) => start);
  let peak = 0;
  const peaks = new Map<string, number>();
  for (const t of times) {
    let total = 0;
    for (const [sound, list] of spans) {
      // Reaching the per-sound limit steals that sound's own oldest voice.
      const count = Math.min(perSound, concurrent(list, t));
      peaks.set(sound, Math.max(peaks.get(sound) ?? 0, count));
      total += count;
    }
    peak = Math.max(peak, total);
  }
  const bound = [...peaks.values()].reduce((sum, value) => sum + value, 0);
  expect(peak).toBeLessThan(riffVoiceLimit);
  expect(bound).toBeLessThan(riffVoiceLimit);
});

test("instrument overrides keep the composition and transport while requiring matching lifetimes", async () => {
  const bass = { ...recipes.riffBass, duration: 0.12 };
  const s = setup({ bass });
  const transport = s.riff.start()!;
  await s.advance(transport.timeAt(8) + lookahead);
  expect(s.of(bass).play).toHaveBeenCalledWith(
    expect.objectContaining({
      at: transport.timeAt(8),
      parameters: { frequency: midiToHz(40), velocity: 0.8 },
    }),
  );
  s.riff.dispose();
  expect(s.of(bass).dispose).toHaveBeenCalledOnce();
  expect(() => setup({ bass: recipes.riffLead })).toThrow(
    "bass needs a one-shot",
  );
  expect(() => setup({ lead: recipes.riffBass })).toThrow(
    "lead needs a sustained",
  );
});

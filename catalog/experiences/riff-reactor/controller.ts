import type { AudioEngine, Bus, Recipe, Voice } from "audiobits";
import { createInstrument, type Instrument } from "./instrument";
import { riffInstruments } from "./instruments";
import { createTransport, type Transport } from "./music";

// Preserve the installed controller's existing imports.
export { createTransport, midiToHz } from "./music";
export type RiffTransport = Transport;

/** Intensity tiers: 0 base, 1 harmony and lift, 2 thickest arrangement. */
export type RiffTier = 0 | 1 | 2;
export type RiffTrack =
  | "kick"
  | "snare"
  | "hat"
  | "openHat"
  | "bass"
  | "pad"
  | "arp"
  | "stab"
  | "riser"
  | "crash";
/** One composed event. beat and length are in beats; note is a MIDI number. */
export interface RiffNote {
  readonly beat: number;
  readonly length: number;
  readonly note?: number;
  readonly velocity?: number;
  /** Minimum intensity at which a band event plays. Defaults to 0. */
  readonly tier?: RiffTier;
}
export interface RiffSong {
  readonly title: string;
  readonly bpm: number;
  readonly beatsPerBar: number;
  readonly bars: number;
  readonly band: Readonly<Partial<Record<RiffTrack, readonly RiffNote[]>>>;
  /** The performed part. The controller never plays it on its own. */
  readonly lead: readonly RiffNote[];
}
export type RiffPhase = "idle" | "playing";

export interface BandEvent {
  readonly track: RiffTrack;
  readonly beat: number;
  readonly note?: number;
  readonly velocity: number;
  readonly tier: RiffTier;
}
const trackOrder: readonly RiffTrack[] = [
  "kick",
  "snare",
  "hat",
  "openHat",
  "bass",
  "pad",
  "arp",
  "stab",
  "riser",
  "crash",
];
/** Every band event, ordered by beat. */
export function bandEvents(song: RiffSong): readonly BandEvent[] {
  return trackOrder
    .flatMap((track) =>
      (song.band[track] ?? []).map((note) => ({
        track,
        beat: note.beat,
        velocity: note.velocity ?? 0.8,
        tier: note.tier ?? 0,
        ...(note.note === undefined ? {} : { note: note.note }),
      })),
    )
    .sort((a, b) => a.beat - b.beat);
}
/** Pure lookahead step: events before untilBeat from cursor, and the new cursor. */
export function collectWindow(
  events: readonly BandEvent[],
  cursor: number,
  untilBeat: number,
) {
  let next = cursor;
  while (next < events.length && events[next].beat < untilBeat) next++;
  return { due: events.slice(cursor, next), cursor: next };
}
/** Last beat at which any composed sound starts or ends. */
export function songEndBeat(song: RiffSong): number {
  return Math.max(
    song.bars * song.beatsPerBar,
    ...[...Object.values(song.band), song.lead].flatMap((notes) =>
      (notes ?? []).map((note) => note.beat + note.length),
    ),
  );
}

/** Scheduling horizon and refill period, in seconds of audio clock. */
export const lookahead = 0.15;
export const refillPeriod = 0.025;
/** Seconds between start() and beat 0, so the first batch is never late. */
export const preroll = 0.12;
/** Lifetime of the closing tails after the last composed beat. */
const outro = 2.2;
/** Band events later than this are dropped rather than played late. */
const lateLimit = 0.03;

// Mix: one bus per instrument group under the session's band bus.
const groups = {
  drums: -3,
  bass: -4,
  keys: 0,
  fx: -4,
  lead: 0,
} as const;
type Group = keyof typeof groups;
const routing: Record<RiffTrack, Group> = {
  kick: "drums",
  snare: "drums",
  hat: "drums",
  openHat: "drums",
  crash: "drums",
  bass: "bass",
  pad: "keys",
  arp: "keys",
  stab: "keys",
  riser: "fx",
};
// Stereo placement; arpeggio steps alternate sides on each eighth.
const pans: Partial<Record<RiffTrack, number>> = {
  hat: 0.22,
  openHat: -0.28,
  crash: -0.18,
  stab: 0.12,
};
const panFor = (event: BandEvent) =>
  event.track === "arp"
    ? Math.round(event.beat * 2) % 2
      ? 0.38
      : -0.38
    : (pans[event.track] ?? 0);
/** Override individual recipes without changing composition or game rules. */
export type RiffInstruments = Record<RiffTrack | "lead" | "choke", Recipe>;

// Timers exist in browsers and Node; typed here without DOM or Node libraries.
const clock = globalThis as unknown as {
  setTimeout(run: () => void, milliseconds: number): unknown;
  clearTimeout(timer: unknown): void;
};

let instances = 0;

/**
 * Total output latency of a context: its processing latency (`baseLatency`)
 * plus the device path (`outputLatency`). Either may be missing or zero.
 */
export function totalLatency(context: {
  outputLatency?: number;
  baseLatency?: number;
}) {
  const part = (value: number | undefined) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : 0;
  return part(context.baseLatency) + part(context.outputLatency);
}

/**
 * Sound only. Plays the backing band of a song on the audio clock in short
 * lookahead windows and performs lead notes on request. The application owns
 * activation, input, judging, scoring and visuals, and maps its performance to
 * setIntensity(), which takes effect at the next bar line.
 */
export function createRiff(
  audio: AudioEngine,
  song: RiffSong,
  feedback: {
    phase?(value: RiffPhase): void;
    /** A tier change, with the audio-clock time of the bar where it lands. */
    intensity?(tier: RiffTier, at: number): void;
    /** The song reached its end naturally. */
    finished?(): void;
  } = {},
  presets: Partial<RiffInstruments> = {},
) {
  const palette: RiffInstruments = { ...riffInstruments, ...presets };
  for (const track of [...trackOrder, "choke"] as const)
    if (palette[track].kind !== "one-shot")
      throw new TypeError(`${track} needs a one-shot instrument`);
  if (palette.lead.kind !== "sustained")
    throw new TypeError("lead needs a sustained instrument");
  const instance = ++instances;
  const events = bandEvents(song);
  const endBeat = songEndBeat(song);
  const sounds = Object.fromEntries(
    trackOrder.map((track) => [track, createInstrument(audio, palette[track])]),
  ) as Record<RiffTrack, Instrument>;
  const lead = createInstrument(audio, palette.lead);
  const choke = createInstrument(audio, palette.choke);
  const listeners = new Set<(value: RiffPhase) => void>();
  const timers = new Set<unknown>();
  const retiring = new Set<Bus>();
  let phase: RiffPhase = "idle";
  let generation = 0;
  let disposed = false;
  let transport: Transport | undefined;
  let band: Bus | undefined;
  let buses: Partial<Record<Group, Bus>> = {};
  let cursor = 0;
  let scheduledBeat = 0;
  let tier: RiffTier = 0;
  let pending: { tier: RiffTier; fromBeat: number } | undefined;
  let held: { voice: Voice; end: number } | undefined;

  function publish(next: RiffPhase) {
    if (next === phase) return;
    phase = next;
    feedback.phase?.(next);
    for (const listener of listeners) {
      try {
        listener(next);
      } catch {
        /* Observers cannot interrupt ownership transitions. */
      }
    }
  }
  function drop(target: Bus) {
    retiring.delete(target);
    try {
      target.dispose();
    } catch {
      /* Engine disposal already released it. */
    }
  }
  function release(target: Bus | undefined, fade: number) {
    if (!target) return;
    retiring.add(target);
    try {
      target.setGainDb(-60, fade);
    } catch {
      /* A closed context already silenced it. */
    }
    // Cleanup belongs to this bus, not to a session, so it always runs.
    const timer = clock.setTimeout(
      () => {
        timers.delete(timer);
        drop(target);
      },
      (fade + 0.05) * 1000,
    );
    timers.add(timer);
  }
  function reset(fade: number) {
    generation++;
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
    for (const target of [...retiring]) drop(target);
    const current = band;
    band = undefined;
    buses = {};
    transport = undefined;
    held = undefined;
    pending = undefined;
    release(current, fade);
  }
  function tierFor(beat: number): RiffTier {
    return pending && beat >= pending.fromBeat ? pending.tier : tier;
  }

  /** Immediate, click-free silence. Safe to repeat. */
  function stop() {
    if (disposed) return;
    reset(0.02);
    publish("idle");
  }

  /** The application must await audio.start() before calling start. */
  function start() {
    if (disposed || audio.state !== "running") return undefined;
    reset(0.02);
    const token = generation;
    try {
      band = audio.bus(`riff-${instance}-${token}`);
      for (const group of Object.keys(groups) as Group[]) {
        const bus = audio.bus(`riff-${instance}-${token}-${group}`, band);
        bus.setGainDb(groups[group], 0);
        buses[group] = bus;
      }
      const origin = audio.native.context.currentTime + preroll;
      transport = createTransport(song.bpm, origin);
      cursor = 0;
      scheduledBeat = 0;
      publish("playing");
      refill(token);
      return transport;
    } catch (cause) {
      stop();
      throw cause;
    }
  }

  function play(event: BandEvent, at: number) {
    sounds[event.track].play({
      at,
      pan: panFor(event),
      bus: buses[routing[event.track]],
      note: event.note,
      velocity: event.velocity,
    });
  }

  // Runs from start() and from its own generation-checked timer only.
  function refill(token: number) {
    if (token !== generation || disposed || !transport) return;
    if (audio.state !== "running") return;
    const now = audio.native.context.currentTime;
    const horizon = transport.beatAt(now + lookahead);
    const batch = collectWindow(events, cursor, horizon);
    cursor = batch.cursor;
    scheduledBeat = Math.max(scheduledBeat, horizon);
    for (const event of batch.due) {
      if (event.tier > tierFor(event.beat)) continue;
      const at = transport.timeAt(event.beat);
      // A throttled or stalled refill drops stale events instead of flamming.
      if (at < now - lateLimit) continue;
      // The context clock can advance between reads, so late events keep a
      // margin; one refused event never stops the band.
      try {
        play(event, Math.max(at, now + 0.01));
      } catch {
        /* Skipped; the next event plays on time. */
      }
    }
    if (pending && scheduledBeat >= pending.fromBeat) {
      tier = pending.tier;
      pending = undefined;
    }
    // Performed notes end on the refill nearest their charted end.
    if (held && held.end - now < refillPeriod / 2) {
      held.voice.stop();
      held = undefined;
    }
    if (cursor >= events.length && now >= transport.timeAt(endBeat) + outro) {
      finish();
      return;
    }
    const timer = clock.setTimeout(() => {
      timers.delete(timer);
      refill(token);
    }, refillPeriod * 1000);
    timers.add(timer);
  }
  function finish() {
    reset(0.3);
    publish("idle");
    feedback.finished?.();
  }

  /**
   * Request an intensity. It lands on the next bar line that has not been
   * scheduled yet, so the arrangement always changes on a downbeat.
   */
  function setIntensity(next: RiffTier) {
    if (disposed || ![0, 1, 2].includes(next)) return;
    if (!transport) {
      tier = next;
      pending = undefined;
      return;
    }
    if (next === (pending?.tier ?? tier)) return;
    if (next === tier) {
      pending = undefined;
      feedback.intensity?.(tier, transport.timeAt(nextBar()));
      return;
    }
    pending = { tier: next, fromBeat: nextBar() };
    feedback.intensity?.(next, transport.timeAt(pending.fromBeat));
  }
  function nextBar() {
    return Math.ceil(scheduledBeat / song.beatsPerBar) * song.beatsPerBar;
  }

  /**
   * Perform lead note `index` now, at its charted pitch, until its charted
   * end. Monophonic: the previous performed note stops. Returns its audio
   * times, or undefined when the note has already ended or is not playing.
   */
  function performLead(index: number) {
    const note = song.lead[index];
    if (disposed || !transport || !note || note.note === undefined) return;
    if (audio.state !== "running") return;
    const token = generation;
    const now = audio.native.context.currentTime;
    const end = transport.timeAt(note.beat + note.length);
    if (end - now < 0.03) return undefined;
    held?.voice.stop();
    const voice = lead.play({
      bus: buses.lead,
      note: note.note,
      velocity: note.velocity ?? 0.85,
    });
    const current = { voice, end };
    held = current;
    void voice.ended.then(() => {
      if (token === generation && held === current) held = undefined;
    });
    return Object.freeze({ at: now, end });
  }

  /** A short muted thunk for a missed or stray input. The band is unchanged. */
  function chokeLead() {
    if (disposed || !transport || audio.state !== "running") return;
    held?.voice.stop();
    held = undefined;
    choke.play({ bus: buses.lead });
  }

  const unsubscribe = audio.subscribe((state) => {
    if (phase !== "idle" && state !== "running" && state !== "starting") stop();
  });

  /** Permanent release of owned sounds, buses, timers and listeners. */
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
    for (const target of [...retiring]) drop(target);
    unsubscribe();
    listeners.clear();
    for (const sound of [...Object.values(sounds), lead, choke])
      sound.dispose();
  }

  return {
    start,
    stop,
    dispose,
    setIntensity,
    performLead,
    choke: chokeLead,
    /** Beat position of an audio-clock time, or NaN while idle. */
    beatAt(time: number) {
      return transport ? transport.beatAt(time) : Number.NaN;
    },
    /** Output latency of the context, for judging and visuals. */
    get latency() {
      if (disposed || audio.state !== "running") return 0;
      return totalLatency(audio.native.context);
    },
    onPhase(listener: (value: RiffPhase) => void) {
      if (disposed) return () => {};
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get phase() {
      return phase;
    },
    get transport() {
      return transport;
    },
    /** The tier playing now and the requested one, if it is still pending. */
    get intensity() {
      return { current: tier, pending: pending?.tier };
    },
    get endBeat() {
      return endBeat;
    },
    get disposed() {
      return disposed;
    },
  };
}
export type RiffController = ReturnType<typeof createRiff>;

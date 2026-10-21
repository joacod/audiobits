import type {
  RiffSong,
  RiffTier,
} from "../../../catalog/experiences/riff-reactor/controller";

// Website game rules for Riff Reactor: lanes, the hit window, judging, streaks
// and score. The installed sound source never imports this module.

export type Lane = 0 | 1 | 2;
export interface ChartNote {
  /** Index into song.lead, passed to performLead(). */
  readonly index: number;
  readonly lane: Lane;
  readonly beat: number;
  readonly length: number;
}

/** Seconds either side of a note that still count as a hit. */
export const hitWindow = 0.1;
/** Seconds either side that count as perfect. */
export const perfectWindow = 0.04;

/** Longest main-thread wait credited back to a press, in seconds. */
export const maxInputDelay = 0.25;

/**
 * Audio-clock time of an input. `contextTime` and `handledAt`
 * (performance.now()) are read together while handling the event, and
 * `stamp` is the event's timeStamp, so time the event spent waiting on a busy
 * main thread is not judged as a late press. Implausible stamps are ignored.
 */
export function inputTime(
  contextTime: number,
  handledAt: number,
  stamp: number,
) {
  const waited = (handledAt - stamp) / 1000;
  return Number.isFinite(waited) && waited > 0 && waited <= maxInputDelay
    ? contextTime - waited
    : contextTime;
}

/** Lanes follow melodic contour: up moves right, down moves left. */
export function buildChart(song: RiffSong): readonly ChartNote[] {
  let lane: Lane = 1;
  let previous: number | undefined;
  return song.lead.map((note, index) => {
    const pitch = note.note ?? 0;
    if (previous !== undefined && pitch !== previous)
      lane = Math.max(
        0,
        Math.min(2, lane + (pitch > previous ? 1 : -1)),
      ) as Lane;
    previous = pitch;
    return Object.freeze({ index, lane, beat: note.beat, length: note.length });
  });
}

/** Streak thresholds for tiers 1 and 2. */
export const tierStreaks = [6, 16] as const;
export const tierForStreak = (streak: number): RiffTier =>
  streak >= tierStreaks[1] ? 2 : streak >= tierStreaks[0] ? 1 : 0;

export type Judgement =
  | {
      readonly kind: "hit";
      readonly note: ChartNote;
      readonly grade: "perfect" | "good";
      /** Seconds; negative is early. */
      readonly offset: number;
    }
  | { readonly kind: "stray"; readonly lane: Lane };

/**
 * Judging on song beats. Callers convert one audio-clock time per input,
 * corrected for output latency, with the controller's transport.
 */
export function createPerformance(
  chart: readonly ChartNote[],
  secondsPerBeat: number,
) {
  const judged = new Uint8Array(chart.length);
  let next = 0;
  let streak = 0;
  let best = 0;
  let score = 0;
  let hits = 0;
  let misses = 0;
  const window = hitWindow / secondsPerBeat;
  function advance() {
    while (next < chart.length && judged[next]) next++;
  }
  // A miss drops the streak to the start of the tier below, not to zero.
  function miss() {
    misses++;
    const tier = tierForStreak(streak);
    streak = tier === 2 ? tierStreaks[0] : 0;
  }
  return {
    /** Mark every unjudged note whose window closed before `beat`. */
    sweep(beat: number): ChartNote[] {
      const missed: ChartNote[] = [];
      for (let i = next; i < chart.length && chart[i].beat + window < beat; i++)
        if (!judged[i]) {
          judged[i] = 2;
          missed.push(chart[i]);
          miss();
        }
      advance();
      return missed;
    },
    /** Judge a press in `lane` at song `beat`. */
    press(lane: Lane, beat: number): Judgement {
      let found = -1;
      for (let i = next; i < chart.length; i++) {
        const note = chart[i];
        if (note.beat - window > beat) break;
        if (judged[i] || note.lane !== lane) continue;
        if (Math.abs(note.beat - beat) <= window) {
          found = i;
          break;
        }
      }
      if (found < 0) {
        miss();
        return { kind: "stray", lane };
      }
      judged[found] = 1;
      advance();
      const offset = (beat - chart[found].beat) * secondsPerBeat;
      const grade = Math.abs(offset) <= perfectWindow ? "perfect" : "good";
      streak++;
      best = Math.max(best, streak);
      hits++;
      score += (grade === "perfect" ? 100 : 60) * (1 + tierForStreak(streak));
      return { kind: "hit", note: chart[found], grade, offset };
    },
    get streak() {
      return streak;
    },
    get best() {
      return best;
    },
    get score() {
      return score;
    },
    get hits() {
      return hits;
    },
    get misses() {
      return misses;
    },
    get tier() {
      return tierForStreak(streak);
    },
    get done() {
      return next >= chart.length;
    },
  };
}
export type Performance = ReturnType<typeof createPerformance>;

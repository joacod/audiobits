import { createAudio, type AudioEngine } from "audiobits";
import {
  createRiff,
  type RiffPhase,
  type RiffSong,
  type RiffTier,
  type RiffTransport,
  type RiffInstruments,
} from "./controller";
import { riffReactorSong } from "./song";

/** Global voice limit, sized above the top-tier budget so stealing never fires. */
export const riffVoiceLimit = 48;
export const riffVoicesPerSound = 8;

export function createRiffAudio() {
  return createAudio({
    maxVoices: riffVoiceLimit,
    maxVoicesPerSound: riffVoicesPerSound,
    masterGainDb: -8,
  });
}

/** The browser host owns one bounded engine; the controller owns its voices. */
export function mountRiff(
  feedback: {
    phase(value: RiffPhase): void;
    starting(value: boolean): void;
    error(cause: unknown): void;
    /** A new session started on this transport. */
    started?(transport: RiffTransport): void;
    intensity?(tier: RiffTier, at: number): void;
    finished?(): void;
  },
  // Passing an activated engine transfers ownership, including disposal.
  audio: AudioEngine = createRiffAudio(),
  song: RiffSong = riffReactorSong,
) {
  const callbacks = {
    phase: feedback.phase,
    intensity: (tier: RiffTier, at: number) => feedback.intensity?.(tier, at),
    finished: () => feedback.finished?.(),
  };
  let control = createRiff(audio, song, callbacks);
  const listeners = new AbortController();
  let disposed = false;
  let generation = 0;
  let pending = false;
  const fail = (cause: unknown) => {
    if (!disposed) feedback.error(cause);
  };
  function clearPending() {
    if (!pending) return;
    pending = false;
    feedback.starting(false);
  }
  function stop() {
    if (disposed) return;
    generation++;
    clearPending();
    control.stop();
  }
  // A hidden tab throttles timers, so a song cannot keep its refills; it stops.
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden && !disposed) {
        stop();
        void audio.suspend().catch(fail);
      }
    },
    { signal: listeners.signal },
  );
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) {
        stop();
        void audio.suspend().catch(fail);
      } else {
        void dispose().catch(fail);
      }
    },
    { signal: listeners.signal },
  );
  async function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    listeners.abort();
    control.dispose();
    await audio.dispose();
  }
  /** Call synchronously inside the Play gesture. Restarts from the top. */
  function play() {
    if (disposed || document.hidden || pending) return;
    const token = ++generation;
    pending = true;
    feedback.starting(true);
    void audio
      .start()
      .then(() => {
        if (disposed || document.hidden || token !== generation) return;
        const transport = control.start();
        clearPending();
        if (transport) feedback.started?.(transport);
      })
      .catch((cause: unknown) => {
        if (disposed || token !== generation) return;
        stop();
        fail(cause);
      });
  }
  return {
    audio,
    get control() {
      return control;
    },
    get song() {
      return song;
    },
    /** Retain the activated engine, cancel the old session and await a new gesture. */
    select(next: RiffSong, instruments: Partial<RiffInstruments> = {}) {
      if (disposed) return;
      stop();
      control.dispose();
      song = next;
      control = createRiff(audio, song, callbacks, instruments);
    },
    /** True while a Play gesture waits for audio activation. */
    get starting() {
      return pending;
    },
    play,
    stop,
    dispose,
  };
}

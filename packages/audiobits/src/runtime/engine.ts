import { OwnedBus } from "./bus";
import type { Bus } from "./bus";
import { validateRecipe, AudioBitsError } from "../recipe/validate";
import type { Recipe } from "../recipe/generated";
import {
  controlsFor,
  validateControls,
  validateSeed,
} from "../compiler/values";
import type { Controls } from "../compiler/values";
import { compile } from "../compiler/plan";
import { checkNyquist, createGraph } from "../compiler/graph";
import type { Graph } from "../compiler/graph";

export type AudioState =
  | "idle"
  | "starting"
  | "running"
  | "suspended"
  | "interrupted"
  | "closed"
  | "disposed";
export interface AudioOptions {
  readonly maxVoices?: number;
  readonly maxVoicesPerSound?: number;
  readonly masterGainDb?: number;
}
type RecipeParameters<R extends Recipe> = "parameters" extends keyof R
  ? NonNullable<R["parameters"]>
  : never;
type NamedControls<K extends PropertyKey> = [K] extends [never]
  ? Readonly<Record<string, never>>
  : string extends K
    ? Controls
    : Readonly<Partial<Record<K, number>>>;
export type RecipeControls<R extends Recipe = Recipe> = [
  RecipeParameters<R>,
] extends [never]
  ? Readonly<Record<string, never>>
  : NamedControls<keyof RecipeParameters<R>>;
export type LiveControls<R extends Recipe = Recipe> = [
  RecipeParameters<R>,
] extends [never]
  ? Readonly<Record<string, never>>
  : string extends keyof RecipeParameters<R>
    ? Controls
    : NamedControls<
        {
          [K in keyof RecipeParameters<R>]: RecipeParameters<R>[K] extends {
            readonly mode: "live";
          }
            ? K
            : never;
        }[keyof RecipeParameters<R>]
      >;

export interface PlayOptions<R extends Recipe = Recipe> {
  readonly at?: number;
  readonly gainDb?: number;
  readonly pan?: number;
  readonly parameters?: RecipeControls<R>;
  readonly seed?: number;
  readonly bus?: Bus;
}
export interface Voice<R extends Recipe = Recipe> {
  readonly ended: Promise<void>;
  readonly seed: number;
  readonly parameters: RecipeControls<R>;
  set(parameters: LiveControls<R>): void;
  readonly state: "active" | "stopping" | "retiring" | "ended";
  stop(): void;
}
export interface Sound<R extends Recipe = Recipe> {
  readonly recipe: R;
  play(options?: PlayOptions<R>): Voice<R>;
  dispose(): void;
}
export interface AudioEngine {
  readonly state: AudioState;
  readonly counts: { readonly active: number; readonly retiring: number };
  start(): Promise<void>;
  suspend(): Promise<void>;
  sound<const R extends Recipe>(input: R): Sound<R>;
  sound(input: unknown): Sound;
  readonly master: Bus;
  bus(name: string, parent?: Bus): Bus;
  readonly native: {
    readonly context: AudioContext;
    readonly output: AudioNode;
    connect(node: AudioNode): () => void;
  };
  stopAll(options?: { readonly tails?: "allow" | "cut" }): void;
  setMuted(muted: boolean): void;
  subscribe(listener: (state: AudioState) => void): () => void;
  dispose(): Promise<void>;
}
interface RecordVoice {
  sound: Sound;
  bus: OwnedBus;
  voice: Voice;
  graph: Graph | undefined;
  finish(): void;
  status: "active" | "stopping" | "retiring" | "ended";
}
function range(value: number, min: number, max: number, name: string): number {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new AudioBitsError(
      "invalid-option",
      `${name} must be in [${min}, ${max}].`,
    );
  return value;
}

// Internal context injection boundary for lifecycle tests.
export function createEngine(
  options: AudioOptions,
  contextFactory: () => AudioContext,
): AudioEngine {
  const maxVoices = range(options.maxVoices ?? 32, 1, 128, "maxVoices");
  const perSound = range(
    options.maxVoicesPerSound ?? 8,
    1,
    128,
    "maxVoicesPerSound",
  );
  if (!Number.isInteger(maxVoices) || !Number.isInteger(perSound))
    throw new AudioBitsError(
      "invalid-option",
      "Voice limits must be integers.",
    );
  const level =
    10 ** (range(options.masterGainDb ?? -12, -60, 0, "masterGainDb") / 20);
  let state: AudioState = "idle";
  let generation = 0;
  let wantsRunning = false;
  let activated = false;
  let context: AudioContext | undefined;
  let master: OwnedBus | undefined;
  const buses = new Map<string, OwnedBus>();
  const owner = {};
  const taps = new Set<AudioNode>();
  let muted = false;
  let pending: Promise<void> | undefined;
  let cancelStart: (() => void) | undefined;
  let disposal: Promise<void> | undefined;
  const voices: RecordVoice[] = [];
  const listeners = new Set<(state: AudioState) => void>();
  const emit = (next: AudioState) => {
    state = next;
    for (const listener of listeners) {
      try {
        listener(state);
      } catch {
        /* Observers cannot interrupt ownership transitions. */
      }
    }
  };
  const terminal = () => {
    if (state === "disposed" || state === "closed")
      throw new AudioBitsError(
        "disposed",
        "This engine is terminal; create a new engine.",
      );
  };
  const finalize = () => {
    for (const record of [...voices]) record.finish();
  };
  function syncNative() {
    if (!context || state === "disposed") return;
    const native = context.state as string;
    if (native === "running" && !wantsRunning) {
      void context.suspend().catch(() => {});
      return;
    }
    if (native !== "running" && state !== "starting") wantsRunning = false;
    if (native !== "running") {
      finalize();
      for (const bus of buses.values()) bus.clear();
    }
    if (state !== "starting")
      emit(
        native === "running"
          ? "running"
          : native === "closed"
            ? "closed"
            : native === "interrupted"
              ? "interrupted"
              : "suspended",
      );
  }
  function within(bus: OwnedBus, ancestor: OwnedBus): boolean {
    for (let cursor: OwnedBus | null = bus; cursor; cursor = cursor.parent)
      if (cursor === ancestor) return true;
    return false;
  }
  function childTail(bus: OwnedBus): number {
    let longest = 0;
    for (const child of buses.values())
      if (child.parent === bus)
        longest = Math.max(
          longest,
          Math.min(5, child.tailSeconds + childTail(child)),
        );
    return longest;
  }
  function refreshRoutes() {
    for (const bus of buses.values()) {
      if (voices.some((record) => within(record.bus, bus))) bus.prepare();
      else bus.tail(childTail(bus));
    }
  }
  function removeBus(bus: OwnedBus) {
    for (const record of [...voices])
      if (within(record.bus, bus)) record.finish();
    for (const child of [...buses.values()])
      if (within(child, bus)) {
        child.destroy();
        buses.delete(child.name);
      }
  }
  function bindSound<const R extends Recipe>(input: R): Sound<R>;
  function bindSound(input: unknown): Sound;
  function bindSound(input: unknown): Sound {
    terminal();
    const result = validateRecipe(input);
    if (!result.ok)
      throw new AudioBitsError(
        "invalid-recipe",
        "Recipe validation failed.",
        result.issues,
      );
    const recipe = result.recipe;

    let disposed = false;
    const sound: Sound = {
      recipe,
      play(playOptions = {}) {
        terminal();
        if (disposed)
          throw new AudioBitsError("disposed", "Sound has been disposed.");
        if (state !== "running" || context?.state !== "running" || !master)
          throw new AudioBitsError(
            "not-ready",
            "Call start() from a user gesture before playing.",
          );
        const route = playOptions.bus ?? master;
        if (!(route instanceof OwnedBus) || route.owner !== owner)
          throw new AudioBitsError(
            "invalid-route",
            "Bus must belong to this engine.",
          );
        route.assert();
        const now = context.currentTime;
        const at = playOptions.at ?? now;
        range(at, now, Number.MAX_SAFE_INTEGER, "at");
        const gainDb = range(playOptions.gainDb ?? 0, -60, 0, "gainDb");
        const pan = range(playOptions.pan ?? 0, -1, 1, "pan");
        let parameters = controlsFor(recipe, playOptions.parameters);
        const seed = validateSeed(
          playOptions.seed === undefined
            ? Math.floor(Math.random() * 0x100000000)
            : playOptions.seed,
        );
        const plan = compile(recipe, parameters, seed);
        checkNyquist(plan, context.sampleRate);
        // Reserved future starts count as active. At most one global retiree,
        // which also guarantees at most one retiree for any individual sound.
        const active = () =>
          voices.filter(
            (record) =>
              record.status === "active" || record.status === "stopping",
          );
        const own = active().filter((record) => record.sound === sound);
        const victim =
          own.length >= perSound
            ? own[0]
            : active().length >= maxVoices
              ? active()[0]
              : undefined;
        if (victim) {
          for (const record of [...voices])
            if (record.status === "retiring") record.finish();
          victim.status = "retiring";
          victim.graph?.stop(0.005);
        }
        let resolveEnded!: () => void;
        const ended = new Promise<void>((resolve) => {
          resolveEnded = resolve;
        });
        const record: RecordVoice = {
          sound,
          bus: route,
          status: "active",
          graph: undefined,
          voice: {
            ended,
            seed,
            get parameters() {
              return parameters;
            },
            set(update) {
              if (record.status !== "active" || context?.state !== "running")
                throw new AudioBitsError(
                  "ended-voice",
                  "Voice is no longer active.",
                );
              const validated = validateControls(recipe, update, true);
              const next = Object.freeze({ ...parameters, ...validated });
              record.graph!.set(next);
              parameters = next;
            },
            get state() {
              return record.status;
            },
            stop() {
              if (record.status !== "active") return;
              record.status = "stopping";
              if (context?.state !== "running") record.finish();
              else record.graph?.stop();
            },
          },
          finish() {
            if (record.status === "ended") return;
            record.status = "ended";
            record.graph?.finish();
            const index = voices.indexOf(record);
            if (index !== -1) voices.splice(index, 1);
            if (state !== "disposed" && context?.state === "running") {
              for (const bus of buses.values()) {
                if (!voices.some((v) => within(v.bus, bus)))
                  bus.tail(childTail(bus));
              }
            }
            resolveEnded();
          },
        };
        for (let bus: OwnedBus | null = route; bus; bus = bus.parent)
          bus.prepare();
        voices.push(record);
        try {
          record.graph = createGraph(
            context,
            route.input,
            plan,
            at,
            gainDb,
            pan,
            record.finish,
          );
        } catch (error) {
          record.finish();
          throw error;
        }
        return record.voice;
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        for (const record of [...voices])
          if (record.sound === sound) record.finish();
      },
    };
    return sound;
  }
  const audio: AudioEngine = {
    get state() {
      return state;
    },
    get counts() {
      return {
        active: voices.filter(
          (record) =>
            record.status === "active" || record.status === "stopping",
        ).length,
        retiring: voices.filter((record) => record.status === "retiring")
          .length,
      };
    },
    start() {
      try {
        terminal();
      } catch (error) {
        return Promise.reject(error);
      }
      if (pending) return pending;
      if (wantsRunning && state === "running" && context?.state === "running")
        return Promise.resolve();
      wantsRunning = true;
      const token = ++generation;
      emit("starting");
      if (audio.state === "disposed")
        return Promise.reject(
          new AudioBitsError("disposed", "Engine disposed during startup."),
        );
      let resume: Promise<void>;
      try {
        if (!context) {
          context = contextFactory();
          context.addEventListener("statechange", syncNative);
        }
        if (!master) {
          const root = new OwnedBus(
            "master",
            context,
            owner,
            null,
            removeBus,
            20 * Math.log10(level),
            refreshRoutes,
          );
          root.output.gain.value = muted ? 0 : 1;
          master = root;
          buses.set("master", root);
        }
        // Invoke both creation and resume synchronously in the gesture path.
        resume = context.resume();
      } catch {
        wantsRunning = false;
        emit(context?.state === "closed" ? "closed" : "suspended");
        return Promise.reject(
          new AudioBitsError(
            "start-failed",
            "Audio activation failed. Retry Play with a user gesture.",
          ),
        );
      }
      const cancellation = new Promise<void>((_, reject) => {
        cancelStart = () =>
          reject(
            new AudioBitsError(
              state === "disposed" ? "disposed" : "start-cancelled",
              "Audio start cancelled during cleanup.",
            ),
          );
      });
      // Some browsers leave blocked resume promises pending instead of rejecting.
      // A wall-clock activation deadline exposes a retry; sound scheduling still
      // uses only the context clock.
      let activationTimer: ReturnType<typeof setTimeout>;
      const deadline = new Promise<void>((_, reject) => {
        activationTimer = setTimeout(
          () =>
            reject(
              new AudioBitsError(
                "start-failed",
                "Audio activation timed out. Retry Play with a user gesture.",
              ),
            ),
          2000,
        );
      });
      void resume.then(
        () => {
          if (
            !wantsRunning &&
            context?.state === "running" &&
            state !== "disposed"
          )
            void context.suspend().catch(() => {});
        },
        () => {},
      );
      const operation = Promise.race([resume, cancellation, deadline])
        .then(() => {
          if (token !== generation && state !== "disposed")
            throw new AudioBitsError(
              "start-cancelled",
              "Audio start was cancelled; use a fresh gesture.",
            );
          if (state === "disposed")
            throw new AudioBitsError(
              "disposed",
              "Audio start cancelled during cleanup.",
            );
          if (context?.state !== "running")
            throw new AudioBitsError(
              "start-failed",
              "Audio is blocked. Retry Play with a user gesture.",
            );
          activated = true;
          emit("running");
        })
        .catch((error: unknown) => {
          if (token === generation) wantsRunning = false;
          if (state === "disposed")
            throw new AudioBitsError(
              "disposed",
              "Audio start cancelled during cleanup.",
            );
          emit(context?.state === "closed" ? "closed" : "suspended");
          throw error instanceof AudioBitsError
            ? error
            : new AudioBitsError(
                "start-failed",
                "Audio activation failed. Retry Play with a user gesture.",
              );
        })
        .finally(() => {
          clearTimeout(activationTimer);
          if (pending === operation) {
            pending = undefined;
            cancelStart = undefined;
          }
        });
      pending = operation;
      return operation;
    },
    async suspend() {
      terminal();
      wantsRunning = false;
      const token = ++generation;
      cancelStart?.();
      if (pending) await pending.catch(() => {});
      terminal();
      if (token !== generation) return;
      finalize();
      for (const bus of buses.values()) bus.clear();
      if (context) {
        await context.suspend();
        syncNative();
      }
    },
    sound: bindSound,
    get master() {
      terminal();
      if (!activated || !master)
        throw new AudioBitsError("not-ready", "Call start() first.");
      return master;
    },
    bus(name, parent = audio.master) {
      terminal();
      if (typeof name !== "string" || !name.trim() || name.length > 64)
        throw new AudioBitsError(
          "invalid-option",
          "Bus name must contain 1–64 characters.",
        );
      const existing = buses.get(name);
      if (existing) return existing;
      if (!(parent instanceof OwnedBus) || parent.owner !== owner)
        throw new AudioBitsError(
          "invalid-route",
          "Parent must belong to this engine.",
        );
      parent.assert();
      if (buses.size >= 32)
        throw new AudioBitsError(
          "invalid-option",
          "At most 32 buses including master.",
        );
      const bus = new OwnedBus(
        name,
        context!,
        owner,
        parent,
        removeBus,
        0,
        refreshRoutes,
      );
      buses.set(name, bus);
      return bus;
    },
    get native() {
      terminal();
      if (!activated || !context || !master)
        throw new AudioBitsError("not-ready", "Call start() first.");
      const output = master.output;
      return {
        context,
        output,
        connect(node: AudioNode) {
          terminal();
          if (
            node.context !== context ||
            node === context?.destination ||
            node === output
          )
            throw new AudioBitsError(
              "invalid-route",
              "Native tap must use this context and cannot duplicate destination routing.",
            );
          if (taps.has(node))
            throw new AudioBitsError(
              "invalid-route",
              "Native tap already connected.",
            );
          output.connect(node);
          taps.add(node);
          return () => {
            if (taps.delete(node) && state !== "disposed")
              output.disconnect(node);
          };
        },
      };
    },
    stopAll(options = {}) {
      if (
        options.tails !== undefined &&
        options.tails !== "allow" &&
        options.tails !== "cut"
      )
        throw new AudioBitsError(
          "invalid-option",
          "Tails must be allow or cut.",
        );
      for (const record of [...voices]) {
        if (options.tails === "cut") {
          if (record.status !== "retiring") record.status = "stopping";
          record.graph?.stop(0.005);
        } else record.voice.stop();
        if (context?.state !== "running") record.finish();
      }
      if (options.tails === "cut") for (const bus of buses.values()) bus.cut();
    },
    setMuted(value) {
      terminal();
      if (typeof value !== "boolean")
        throw new AudioBitsError("invalid-option", "Mute must be boolean.");
      muted = value;
      master?.setMuted(value);
    },
    subscribe(listener) {
      terminal();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposal) return disposal;
      if (state === "disposed") return Promise.resolve();
      wantsRunning = false;
      generation++;
      emit("disposed");
      cancelStart?.();
      finalize();
      listeners.clear();
      for (const bus of buses.values()) bus.destroy();
      buses.clear();
      taps.clear();
      if (context) context.removeEventListener("statechange", syncNative);
      disposal =
        context && context.state !== "closed"
          ? context.close()
          : Promise.resolve();
      return disposal;
    },
  };
  return audio;
}
export function createAudio(options: AudioOptions = {}): AudioEngine {
  return createEngine(options, () => {
    if (typeof globalThis.AudioContext !== "function")
      throw new AudioBitsError(
        "unsupported-browser",
        "Web Audio is unavailable.",
      );
    return new globalThis.AudioContext();
  });
}

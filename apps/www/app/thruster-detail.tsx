"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { mountThruster } from "../../../catalog/experiences/reactive-thruster/host";
import { ExperienceSource } from "./experience-source";
import type { ExperienceSourceFile } from "./experience-source";
import { ThrusterRibbons } from "./thruster-ribbons";
import type { ThrusterTarget } from "./thruster-ribbons";

const subscribeHydration = () => () => {};

function recovery(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.includes("Retry Play")
    ? "Audio did not start. Try Start thruster or drag again."
    : `${message}. Try Start thruster or drag again.`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Detail-page host for the catalog thruster controller. One engine. */
export function ThrusterDetail({
  sources,
}: {
  sources: readonly ExperienceSourceFile[];
}) {
  const pad = useRef<HTMLDivElement>(null);
  const craft = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLOutputElement>(null);
  const host = useRef<ReturnType<typeof mountThruster> | null>(null);
  const point = useRef({ x: 50, y: 50 });
  const readout = useRef("0%");
  const pointer = useRef<number | null>(null);
  const target = useRef<ThrusterTarget>({
    x: 0,
    y: 0,
    throttle: 0,
    engaged: false,
    placed: false,
  });
  const wake = useRef<() => void>(() => {});
  const [state, setState] = useState("stopped");
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [throttle, setThrottle] = useState(0.2);
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const readEngine = useCallback(() => host.current?.audio ?? null, []);
  const applyPoint = useCallback(() => {
    const node = craft.current;
    if (!node) return;
    node.style.setProperty("left", `${point.current.x}%`);
    node.style.setProperty("top", `${point.current.y}%`);
  }, []);
  useLayoutEffect(() => {
    applyPoint();
    if (meter.current) meter.current.textContent = readout.current;
  });
  useEffect(() => {
    const surface = pad.current;
    if (!surface) return;
    const current = mountThruster(surface, {
      state(value) {
        setState(value);
        if (value === "starting") setError("");
        if (value === "stopped") {
          target.current.throttle = 0;
          target.current.engaged = false;
          surface.style.setProperty("--thrust", "0");
          readout.current = "0%";
          if (meter.current) meter.current.textContent = readout.current;
          wake.current();
        }
      },
      error(cause) {
        setError(recovery(cause));
      },
      output: setActive,
      throttle(value) {
        target.current.throttle = value;
        surface.style.setProperty("--thrust", value.toFixed(4));
        readout.current = `${Math.round(value * 100)}%`;
        if (meter.current) meter.current.textContent = readout.current;
        wake.current();
      },
    });
    host.current = current;
    return () => {
      host.current = null;
      void current.dispose().catch(console.error);
    };
  }, []);
  function place(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    const x = clamp((event.clientX - bounds.left) / bounds.width, 0.06, 0.94);
    const y = clamp((event.clientY - bounds.top) / bounds.height, 0.1, 0.9);
    point.current = { x: x * 100, y: y * 100 };
    applyPoint();
    target.current.x = event.clientX - bounds.left;
    target.current.y = event.clientY - bounds.top;
    target.current.placed = true;
    target.current.engaged = true;
    event.currentTarget.style.setProperty("--x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--y", `${y * 100}%`);
    wake.current();
  }
  function releasePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerId !== pointer.current) return;
    pointer.current = null;
    target.current.engaged = false;
    wake.current();
  }
  const sampling = active && !muted;
  return (
    <>
      <div className="catalog-stage catalog-thruster-stage">
        <div
          ref={pad}
          className="flight-pad"
          data-state={state}
          role="group"
          aria-label="Drag to fly"
          aria-describedby="flight-help"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            pointer.current = event.pointerId;
            place(event);
          }}
          onPointerMove={(event) => {
            if (event.pointerId !== pointer.current) return;
            place(event);
          }}
          onPointerUp={releasePointer}
          onPointerCancel={releasePointer}
          onLostPointerCapture={releasePointer}
        >
          <ThrusterRibbons
            target={target}
            wakeRef={wake}
            engine={readEngine}
            active={sampling}
          />
          <div ref={craft} className="flight-craft" aria-hidden="true" />
          <p className="flight-invitation">
            {state === "stopped"
              ? "Drag in this field."
              : state === "starting"
                ? "Activating audio."
                : "Movement is the throttle."}
          </p>
          <p className="flight-readout">
            Live thrust <output ref={meter}>0%</output>
          </p>
        </div>
      </div>
      <div className="catalog-playback flight-controls">
        <div className="catalog-transport" role="group" aria-label="Playback">
          <div className="audio-controls">
            <button
              type="button"
              className="play-action"
              disabled={!ready || state !== "stopped"}
              onClick={() => host.current?.start(throttle)}
            >
              Start thruster
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => host.current?.release()}
            >
              Release thruster
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => {
                setError("");
                void host.current?.impact();
              }}
            >
              Play impact
            </button>
            <button
              type="button"
              disabled={!ready}
              aria-pressed={muted}
              onClick={() => {
                const next = !muted;
                host.current?.mute(next);
                setMuted(next);
              }}
            >
              Mute
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => host.current?.stop()}
            >
              Stop all
            </button>
          </div>
          <p className="flight-state" role="status">
            {`Thruster: ${state}${muted ? " · muted" : ""}`}
          </p>
          {error ? <p role="alert">{error}</p> : null}
          <label>
            Keyboard throttle: {Math.round(throttle * 100)}%
            <input
              aria-label="Throttle"
              type="range"
              min="0"
              max="1"
              step="0.01"
              disabled={!ready}
              value={throttle}
              onChange={(event) => {
                const value = Number(event.target.value);
                setThrottle(value);
                host.current?.setThrottle(value);
              }}
            />
          </label>
        </div>
        <p id="flight-help">
          Drag in the field, or use Start and the throttle. Full thrust is 1200
          px/s. Release keeps the tail. Stop cuts it.
        </p>
      </div>
      <div className="catalog-inspector">
        <ExperienceSource
          symbol="reactiveThruster"
          parameter="throttle"
          soundNote="recipe.ts is independent copy-in source for the motor, turbine, and exhaust. It is separate from the simpler catalog Thruster recipe. Install audiobits, copy this file, and create the sound with audio.sound(reactiveThruster). From a user gesture, start audio, play the sound, then update throttle on that voice and stop it."
          interactionNote="Copy recipe.ts, pointer.ts, host.ts, and index.html into one folder. pointer.ts turns pointer velocity into throttle and reaches full thrust at 1200 px/s. Keep pointer capture on the play surface. Start from a direct user gesture. Release keeps up to 280 ms of tail. Stop cuts it. The host shares one engine with impact, suspends on hide, stops on blur, and closes on pagehide. Call host.dispose() when you remove the view. No React or Next.js is required."
          presentation="The ribbons on this page follow the same pointer and throttle as the sound. They are website presentation and are not part of these files."
          sources={sources}
        />
      </div>
    </>
  );
}

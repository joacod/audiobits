"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { mountThruster } from "../../../catalog/experiences/reactive-thruster/host";
import { OutputScope } from "./output-scope";
import { ThrusterRibbons } from "./thruster-ribbons";
import type { ThrusterTarget } from "./thruster-ribbons";
import { bindAudioGestures } from "../lib/audio-gestures";

function recovery(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.includes("Retry Play")
    ? "Audio did not start. Drag again to retry."
    : `${message}. Drag again to retry.`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Detail-page host for the catalog thruster controller. One engine. */
export function ThrusterDetail() {
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
  const [error, setError] = useState("");
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
          pointer.current = null;
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
    const unbind = bindAudioGestures(surface, current.audio, current.stop);
    return () => {
      unbind();
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
  const sampling = active;
  return (
    <>
      <div className="catalog-stage catalog-thruster-stage catalog-gesture-stage">
        <div
          ref={pad}
          className="flight-pad audio-gesture-surface"
          data-state={state}
          role="group"
          aria-label="Drag to fly"
          aria-describedby="flight-help"
          onPointerDown={(event) => {
            if (
              !event.isPrimary ||
              event.button !== 0 ||
              !event.currentTarget.hasPointerCapture(event.pointerId)
            )
              return;
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
            {state === "stopped" ? (
              <>
                <span className="flight-mouse-help">
                  Click and drag to fly.
                </span>
                <span className="flight-touch-help">
                  Touch and drag to fly.
                </span>{" "}
                Faster means louder.
              </>
            ) : state === "starting" ? (
              "Activating audio."
            ) : (
              "Movement is the throttle."
            )}
          </p>
          <p className="flight-readout">
            Live thrust <output ref={meter}>0%</output>
          </p>
        </div>
      </div>
      <div className="catalog-experience-feedback flight-controls">
        <OutputScope engine={readEngine} active={sampling} signal measured />
        <div className="catalog-experience-status">
          <p className="flight-state" role="status">{`Thruster: ${state}`}</p>
          <button
            type="button"
            onClick={() => {
              setError("");
              void host.current?.impact();
            }}
          >
            Play impact
          </button>
        </div>
        <p id="flight-help" className="sr-only">
          Drag to fly. Release to coast.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}

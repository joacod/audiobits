"use client";

import Link from "next/link";
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
import { ArrowIcon } from "../icons/arrow-icon";
import { OutputScope } from "./output-scope";
import { ThrusterRibbons } from "./thruster-ribbons";
import type { ThrusterTarget } from "./thruster-ribbons";

const subscribeHydration = () => () => {};

/** Homepage presentation. The portable host owns all sound and pointer mapping. */
export function ThrusterHero() {
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
    craft.current?.style.setProperty("left", `${point.current.x}%`);
    craft.current?.style.setProperty("top", `${point.current.y}%`);
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
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(`${message}. Try Start thruster or drag again.`);
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
    if (!bounds.width || !bounds.height) return;
    point.current = {
      x: Math.max(
        3,
        Math.min(97, ((event.clientX - bounds.left) / bounds.width) * 100),
      ),
      y: Math.max(
        8,
        Math.min(92, ((event.clientY - bounds.top) / bounds.height) * 100),
      ),
    };
    applyPoint();
    target.current.x = event.clientX - bounds.left;
    target.current.y = event.clientY - bounds.top;
    target.current.placed = true;
    target.current.engaged = true;
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
    <section className="thruster-hero" aria-label="Reactive Thruster hero">
      <div className="thruster-intro">
        <h1>Sound that reacts.</h1>
        <p>
          Procedural sound effects for the web. Take the thruster for a spin.
        </p>
      </div>
      <div className="thruster-playground">
        <div
          ref={pad}
          className="flight-pad"
          data-state={state}
          role="group"
          aria-label="Drag to fly"
          aria-describedby="hero-flight-help"
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
            if (event.pointerId === pointer.current) place(event);
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
          <p className="flight-readout">
            Reactive Thruster{" "}
            <span>
              Thrust <output ref={meter}>0%</output>
            </span>
          </p>
          <p className="flight-invitation" id="hero-flight-help">
            {state === "stopped"
              ? "Drag to fly. Move faster to hear it rise."
              : state === "starting"
                ? "Activating audio."
                : "Movement is the throttle."}
          </p>
        </div>
        <div className="thruster-signal">
          <OutputScope engine={readEngine} active={sampling} signal measured />
        </div>
        <div className="thruster-controls">
          <div
            className="audio-controls"
            role="group"
            aria-label="Thruster audio controls"
          >
            <button
              type="button"
              disabled={!ready || state !== "stopped"}
              onClick={() => host.current?.start(throttle)}
            >
              Start thruster
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
              Stop
            </button>
          </div>
          <label className="thruster-throttle">
            Keyboard throttle
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
          <p
            role="status"
            data-testid="landing-playback-state"
          >{`Thruster: ${state}${muted ? " · muted" : ""}`}</p>
        </div>
        {error ? (
          <p role="alert" className="thruster-error">
            {error}
          </p>
        ) : null}
      </div>
      <div className="landing-links thruster-links">
        <Link href="/catalog/reactive-thruster">
          Open thruster source <ArrowIcon />
        </Link>
        <Link href="/catalog">
          Explore the catalog <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}

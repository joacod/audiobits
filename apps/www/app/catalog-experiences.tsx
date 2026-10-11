"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
} from "react";
import Link from "next/link";
import { mountEnergyCharge } from "../../../catalog/energy-charge/host";
import { mountThruster } from "../../../catalog/reactive-thruster/host";
import { catalogEntriesByCategory } from "../lib/catalog";
import { openCatalogLabel } from "./catalog-label";
import { ChargeRings } from "./charge-rings";

const subscribeHydration = () => () => {};

export function CatalogExperiences() {
  const experiences = catalogEntriesByCategory("experience");
  return (
    <section className="catalog-section" aria-labelledby="catalog-experiences">
      <h2 id="catalog-experiences">Interactive experiences</h2>
      <div className="catalog-experiences">
        {experiences.map((entry) => (
          <article
            key={entry.slug}
            id={entry.slug}
            className={`catalog-experience catalog-experience-${entry.preview.family}`}
            data-catalog-entry={entry.slug}
          >
            {entry.preview.family === "charge" && <ChargePreview />}
            <div className="catalog-experience-copy">
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <ul className="catalog-controls">
                {entry.controls.map((control) => (
                  <li key={control}>{control}</li>
                ))}
              </ul>
              <Link className="catalog-open" href={entry.href}>
                {openCatalogLabel(entry)}
              </Link>
            </div>
            {entry.preview.family === "thruster" && <ThrusterPreview />}
          </article>
        ))}
      </div>
    </section>
  );
}

function ChargePreview() {
  const host = useRef<ReturnType<typeof mountEnergyCharge> | null>(null);
  const frame = useRef(0);
  const holding = useRef(false);
  const pointer = useRef<number | null>(null);
  const pad = useRef<HTMLButtonElement>(null);
  const progress = useRef(0);
  const [charge, setCharge] = useState(0);
  const [state, setState] = useState("stopped");
  const [error, setError] = useState("");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const readEngine = useCallback(() => host.current?.audio ?? null, []);
  const endHold = useCallback(() => {
    holding.current = false;
    cancelAnimationFrame(frame.current);
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && pad.current?.hasPointerCapture(id))
      pad.current.releasePointerCapture(id);
  }, []);
  useEffect(() => {
    const current = mountEnergyCharge({
      state(value) {
        setState(value);
        if (value === "starting") setError("");
        if (value === "stopped") endHold();
      },
      error(cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(`${message} Try Hold to charge again.`);
      },
    });
    host.current = current;
    return () => {
      endHold();
      host.current = null;
      void current.dispose().catch(console.error);
    };
  }, [endHold]);
  function publish(value: number) {
    progress.current = value;
    host.current?.setCharge(value);
    const shown = Math.round(value * 100) / 100;
    setCharge((current) => (current === shown ? current : shown));
  }
  function beginHold() {
    if (holding.current) return;
    holding.current = true;
    publish(0);
    host.current?.start(0);
    let previous: number | undefined;
    function tick(time: number) {
      if (!holding.current) return;
      const elapsed = previous === undefined ? 0 : Math.max(0, time - previous);
      const next = Math.min(1, progress.current + elapsed / 3000);
      publish(next);
      previous = time;
      if (next < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }
  function release() {
    endHold();
    host.current?.release();
  }
  function stop() {
    endHold();
    host.current?.stop();
  }
  return (
    <>
      <button
        ref={pad}
        type="button"
        className="charge-well"
        disabled={!ready}
        aria-label="Hold to charge"
        aria-describedby="catalog-charge-status"
        data-state={state}
        style={{ "--charge": charge } as CSSProperties}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || holding.current) return;
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          beginHold();
        }}
        onPointerUp={(event) => {
          if (pointer.current === event.pointerId) release();
        }}
        onPointerCancel={(event) => {
          if (pointer.current === event.pointerId) stop();
        }}
        onLostPointerCapture={(event) => {
          if (pointer.current === event.pointerId) stop();
        }}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            beginHold();
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            release();
          }
        }}
        onBlur={stop}
      >
        <ChargeRings
          charge={charge}
          progress={progress}
          running={state === "running"}
          engine={readEngine}
        />
        <span className="catalog-charge-readout" aria-hidden="true">
          {Math.round(charge * 100)}%
        </span>
      </button>
      <p
        id="catalog-charge-status"
        className="catalog-status"
        data-testid="energy-charge-state"
        aria-live="polite"
      >
        Energy charge: {state}
      </p>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

function ThrusterPreview() {
  const pad = useRef<HTMLDivElement>(null);
  const host = useRef<ReturnType<typeof mountThruster> | null>(null);
  const [state, setState] = useState("stopped");
  const [error, setError] = useState("");
  const [point, setPoint] = useState({ x: 0.83, y: 0.5 });
  const [thrust, setThrust] = useState(0);
  useEffect(() => {
    const surface = pad.current;
    if (!surface) return;
    const current = mountThruster(surface, {
      state(value) {
        setState(value);
        if (value === "starting") setError("");
        if (value === "stopped") setThrust(0);
      },
      error(cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(`${message} Try the flight field again.`);
      },
      output() {},
      throttle(value) {
        setThrust(value);
      },
    });
    host.current = current;
    return () => {
      host.current = null;
      void current.dispose().catch(console.error);
    };
  }, []);
  function place(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    setPoint({
      x: Math.max(
        0.08,
        Math.min(0.92, (event.clientX - bounds.left) / bounds.width),
      ),
      y: Math.max(
        0.16,
        Math.min(0.84, (event.clientY - bounds.top) / bounds.height),
      ),
    });
  }
  return (
    <div className="catalog-instrument">
      <div
        ref={pad}
        className="thruster-field"
        tabIndex={0}
        role="group"
        aria-label="Drag to fly"
        aria-describedby="catalog-thruster-status"
        data-state={state}
        style={{ "--thrust": thrust } as CSSProperties}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          place(event);
        }}
        onPointerMove={(event) => {
          if (
            !event.isPrimary ||
            !event.currentTarget.hasPointerCapture(event.pointerId)
          )
            return;
          place(event);
        }}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            host.current?.start(0.45);
          }
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            host.current?.release();
          }
        }}
      >
        <svg viewBox="0 0 320 148" aria-hidden="true">
          <path d="M12 34c52-20 96-16 296 10" />
          <path d="M12 62c70-14 128 28 296-8" />
          <path d="M12 90c46 18 150 14 296-10" />
          <path d="M12 116c78-22 140 12 296 6" />
          <circle
            className="thruster-point"
            cx={28 + point.x * 264}
            cy={18 + point.y * 112}
            r="4"
          />
        </svg>
      </div>
      <p
        id="catalog-thruster-status"
        className="catalog-status"
        data-testid="reactive-thruster-state"
        aria-live="polite"
      >
        Reactive thruster: {state}
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

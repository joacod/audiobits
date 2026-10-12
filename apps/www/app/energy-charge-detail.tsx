"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties } from "react";
import { mountEnergyCharge } from "../../../catalog/experiences/energy-charge/host";
import { ChargeRings } from "./charge-rings";
import { ExperienceSource } from "./experience-source";
import type { ExperienceSourceFile } from "./experience-source";

const subscribeHydration = () => () => {};

function recovery(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  return message.includes("Retry Play")
    ? "Audio did not start. Try Start charge again."
    : `${message}. Try Start charge again.`;
}

/** Detail-page host for the catalog Energy Charge controller. One engine. */
export function EnergyChargeDetail({
  sources,
}: {
  sources: readonly ExperienceSourceFile[];
}) {
  const host = useRef<ReturnType<typeof mountEnergyCharge> | null>(null);
  const frame = useRef(0);
  const holding = useRef(false);
  const pointer = useRef<number | null>(null);
  const pad = useRef<HTMLButtonElement>(null);
  const progress = useRef(0);
  const [charge, setCharge] = useState(0);
  const [state, setState] = useState("stopped");
  const [muted, setMuted] = useState(false);
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
        setError(recovery(cause));
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
  const full = charge === 1;
  return (
    <>
      <div className="catalog-stage catalog-charge-stage">
        <div
          className="catalog-charge-well"
          style={{ "--charge": charge } as CSSProperties}
        >
          <ChargeRings
            charge={charge}
            progress={progress}
            running={state === "running"}
            engine={readEngine}
          />
          <button
            ref={pad}
            type="button"
            className="charge-hold"
            disabled={!ready}
            aria-label="Hold to charge"
            aria-describedby="charge-help"
            data-state={state}
            data-full={full}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0 || holding.current)
                return;
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
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                if (!event.repeat) beginHold();
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
            <span className="charge-percent" aria-hidden="true">
              {Math.round(charge * 100)}%
            </span>
            <span className="charge-hold-label" aria-hidden="true">
              {state === "running" && full ? "Full charge" : "Hold to charge"}
            </span>
          </button>
        </div>
      </div>
      <div className="catalog-playback energy-controls">
        <div className="catalog-transport" role="group" aria-label="Playback">
          <div className="audio-controls">
            <button
              type="button"
              className="play-action"
              disabled={!ready}
              onClick={() => {
                endHold();
                host.current?.start(progress.current);
              }}
            >
              Start charge
            </button>
            <button type="button" disabled={!ready} onClick={release}>
              Release charge
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
            <button type="button" disabled={!ready} onClick={stop}>
              Stop all
            </button>
          </div>
          <p className="energy-state" role="status">
            {`Charge: ${state}${muted ? " · muted" : ""}`}
          </p>
          {error ? <p role="alert">{error}</p> : null}
          <label>
            Charge: {Math.round(charge * 100)}%
            <input
              aria-label="Charge"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={charge}
              disabled={!ready}
              onChange={(event) => {
                endHold();
                publish(Number(event.target.value));
              }}
            />
          </label>
        </div>
        <p id="charge-help">
          Hold with a pointer, touch, Space, or Enter. Three seconds to full
          charge. Release keeps the tail. Stop cuts it. Rings follow charge,
          including while muted.
        </p>
      </div>
      <div className="catalog-inspector">
        <ExperienceSource
          symbol="energyCharge"
          parameter="charge"
          soundNote="recipe.ts is independent copy-in source. It is not an export from audiobits/recipes. Install audiobits, copy this file, and create the sound with audio.sound(energyCharge). From a user gesture, start audio, play the sound, then update charge on that voice and stop it."
          interactionNote="Copy recipe.ts, progress.ts, host.ts, and index.html into one folder. Start from a direct user gesture. Supply progress in either direction. Full charge holds until release. Release keeps the tail. Stop cuts it. The host suspends on hide, stops on blur, and closes on pagehide. Call host.dispose() when you remove the view. progress.ts can share an application engine. No React or Next.js is required."
          presentation="The rings on this page follow charge and measured output. They are website presentation and are not part of these files."
          sources={sources}
        />
      </div>
    </>
  );
}

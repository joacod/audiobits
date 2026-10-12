"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { energyChargeExperience } from "../lib/experiences";
import { mountEnergyCharge } from "../../../catalog/energy-charge/host";
import { ArrowIcon } from "./arrow-icon";
import { ChargeRings } from "./charge-rings";
import { OutputScope } from "./output-scope";

const subscribeHydration = () => () => {};

/** Homepage host for the catalog Energy Charge controller. No second audio graph. */
export function ChargeHero() {
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
  const [copyState, setCopyState] = useState("");
  const copyTimer = useRef(0);
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
        setError(
          message.includes("Retry Play")
            ? "Audio did not start. Try Start charge again."
            : `${message} Try Start charge again.`,
        );
      },
    });
    host.current = current;
    return () => {
      endHold();
      host.current = null;
      window.clearTimeout(copyTimer.current);
      void current.dispose().catch(console.error);
    };
  }, [endHold]);
  async function copyInstall() {
    window.clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText("npm install audiobits");
      setCopyState("Copied");
      copyTimer.current = window.setTimeout(() => setCopyState(""), 2400);
    } catch {
      setCopyState("Copy failed. Select the command to copy.");
    }
  }
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
    <section className="charge-hero" aria-label="Energy charge hero">
      <div className="charge-copy">
        <h1>
          Sound that <em>reacts.</em>
        </h1>
        <p className="charge-lede">
          Procedural sound effects for the web. Hold to charge one voice, then
          copy the Energy Charge interaction into your app.
        </p>
        <div className="landing-links">
          <Link className="landing-primary" href="/catalog">
            Explore the catalog <ArrowIcon />
          </Link>
          <Link href="/docs">
            Start building <ArrowIcon />
          </Link>
          <Link className="landing-quiet" href={energyChargeExperience.href}>
            Open energy charge <ArrowIcon />
          </Link>
        </div>
        <div className="install-line">
          <code className="landing-install">npm install audiobits</code>
          <button
            type="button"
            className="copy-install"
            aria-label="Copy install command"
            onClick={() => void copyInstall()}
          >
            {copyState === "Copied" ? "Copied" : "Copy"}
          </button>
          <p className="copy-status" role="status" aria-live="polite">
            {copyState === "Copied" ? "Install command copied." : copyState}
          </p>
        </div>
      </div>
      <div className="charge-stage">
        <div
          className="charge-well"
          style={{ "--charge": charge } as React.CSSProperties}
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
        <div className="charge-panel">
          <p id="charge-help" className="charge-legend">
            Silent until you hold. Rings follow charge, including while muted.
            Brightness follows output when motion is allowed.
          </p>
          <p role="status" data-testid="landing-playback-state">
            Charge: {state}
            {muted ? " · muted" : ""}
          </p>
          <figure className="charge-binding">
            <figcaption>App state passed to the voice</figcaption>
            <pre>
              <code>{`voice.set({ charge: ${charge.toFixed(2)} })`}</code>
            </pre>
          </figure>
          <label>
            Charge <output>{Math.round(charge * 100)}%</output>
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
          <div
            className="audio-controls"
            role="group"
            aria-label="Manual charge controls"
          >
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
              Stop
            </button>
          </div>
          {error ? (
            <p role="alert" className="charge-error">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <div className="charge-signal">
        <OutputScope engine={readEngine} active={state === "running"} signal />
      </div>
    </section>
  );
}

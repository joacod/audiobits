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
import { bindAudioGestures } from "../lib/audio-gestures";
import {
  audioErrorMessage,
  formatAudioActivationReport,
} from "../lib/audio-activation-report";
import { AudioActivationReport } from "./audio-activation-report";

const subscribeHydration = () => () => {};

/** Detail-page host for the catalog Energy Charge controller. One engine. */
export function EnergyChargeDetail() {
  const host = useRef<ReturnType<typeof mountEnergyCharge> | null>(null);
  const frame = useRef(0);
  const holding = useRef(false);
  const running = useRef(false);
  const pointer = useRef<number | null>(null);
  const pad = useRef<HTMLButtonElement>(null);
  const progress = useRef(0);
  const [charge, setCharge] = useState(0);
  const [state, setState] = useState("stopped");
  const [error, setError] = useState("");
  const [report, setReport] = useState("");
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
    const reportError = (cause: unknown) => {
      setError(`${audioErrorMessage(cause)} Hold to charge again.`);
      setReport(formatAudioActivationReport(cause, pad.current));
    };
    const current = mountEnergyCharge({
      state(value) {
        running.current = value === "running";
        setState(value);
        if (value === "starting") setError("");
        if (value === "stopped") endHold();
      },
      error: reportError,
    });
    host.current = current;
    const unbind = pad.current
      ? bindAudioGestures(
          pad.current,
          current.audio,
          current.stop,
          reportError,
          () => setError(""),
        )
      : undefined;
    return () => {
      unbind?.();
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
      if (!running.current) {
        previous = undefined;
        frame.current = requestAnimationFrame(tick);
        return;
      }
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
      <div className="catalog-stage catalog-charge-stage catalog-gesture-stage">
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
            className="charge-hold audio-gesture-surface"
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
      <div className="catalog-experience-feedback energy-controls">
        <p id="charge-help">Hold to build. Release to let it ring.</p>
        <p className="energy-state" role="status">{`Charge: ${state}`}</p>
        <AudioActivationReport error={error} report={report} />
      </div>
    </>
  );
}

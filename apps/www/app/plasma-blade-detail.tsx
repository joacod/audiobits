"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { mountPlasmaBlade } from "../../../catalog/experiences/plasma-blade/host";
import { mountBladeStage } from "../../../catalog/experiences/plasma-blade/stage";
import "./plasma-blade.css";

const subscribeHydration = () => () => {};

export function PlasmaBladeDetail() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<ReturnType<typeof mountPlasmaBlade> | null>(null);
  const stage = useRef<ReturnType<typeof mountBladeStage> | null>(null);
  const [state, setState] = useState("stopped");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [muted, setMuted] = useState(false);
  const [hits, setHits] = useState(0);
  const [error, setError] = useState("");
  const reportError = useCallback((cause: unknown) => {
    setError(
      `${cause instanceof Error ? cause.message : String(cause)}. Tap Ignite to retry.`,
    );
  }, []);
  useEffect(() => {
    const current = mountPlasmaBlade({
      state(value) {
        setState(value);
        if (value === "starting") setError("");
        stage.current?.stateChanged();
      },
      impact() {
        setHits((value) => value + 1);
      },
      error: reportError,
    });
    host.current = current;
    let display: ReturnType<typeof mountBladeStage> | undefined;
    try {
      if (canvas.current) display = mountBladeStage(canvas.current, current);
      stage.current = display ?? null;
    } catch (cause) {
      // Canvas is initialized after mount; a synchronous native failure needs visible recovery.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reportError(cause);
    }
    return () => {
      display?.dispose();
      stage.current = null;
      host.current = null;
      void current.dispose().catch(console.error);
    };
  }, [reportError]);
  return (
    <>
      <div className="plasma-stage catalog-gesture-stage">
        <canvas
          ref={canvas}
          className="plasma-canvas"
          role="group"
          aria-label="Plasma blade stage"
          aria-describedby="plasma-help"
          tabIndex={ready ? 0 : -1}
        />
        <div className="plasma-stage-caption" aria-hidden="true">
          <span>
            {state === "stopped"
              ? "Hold to ignite"
              : state === "starting"
                ? "Drawing the arc…"
                : "Move. Cut through the field."}
          </span>
          <span>Procedural audio · No samples</span>
        </div>
      </div>
      <div className="plasma-controls catalog-experience-feedback">
        <div className="plasma-actions">
          <button
            type="button"
            disabled={!ready || state === "starting"}
            onClick={() => {
              if (state === "running") {
                if (stage.current) stage.current.retract();
                else host.current?.retract();
              } else host.current?.ignite();
            }}
          >
            {state === "running" ? "Retract" : "Ignite"}
          </button>
          <button
            type="button"
            disabled={state !== "running"}
            onClick={() => stage.current?.strike()}
          >
            Strike target
          </button>
          <button
            type="button"
            disabled={!ready}
            aria-pressed={muted}
            onClick={() => {
              host.current?.mute(!muted);
              setMuted(!muted);
            }}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              stage.current?.reset();
              host.current?.stop();
            }}
          >
            Stop all
          </button>
        </div>
        <div className="plasma-readout">
          <p role="status">{`Blade: ${state}`}</p>
          <p>
            <span>Targets struck</span>{" "}
            <output aria-label="Targets struck">{hits}</output>
          </p>
        </div>
        <p id="plasma-help">
          Hold the stage and drag to swing through the amber targets. Release to
          retract. The Ignite button keeps the blade on until Retract. Keyboard:
          Enter ignites, arrows move, Space strikes, Escape retracts.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { mountPlasmaBlade } from "../../../catalog/experiences/plasma-blade/host";
import { mountBladeStage3D } from "./plasma-blade-stage";
import "./plasma-blade.css";

const subscribeHydration = () => () => {};

export function PlasmaBladeDetail() {
  const surface = useRef<HTMLDivElement>(null);
  const host = useRef<ReturnType<typeof mountPlasmaBlade> | null>(null);
  const stage = useRef<ReturnType<typeof mountBladeStage3D> | null>(null);
  const [state, setState] = useState("stopped");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [muted, setMuted] = useState(false);
  const [hits, setHits] = useState(0);
  const [error, setError] = useState("");
  const [displayError, setDisplayError] = useState("");
  const reportError = useCallback((cause: unknown) => {
    setError(
      `${cause instanceof Error ? cause.message : String(cause)}. Tap Ignite to retry.`,
    );
  }, []);
  const reportDisplayError = useCallback(() => {
    setDisplayError(
      "The 3D display is unavailable. You can still use Ignite, Retract, Mute and Stop below. Reload the page to retry the display.",
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
    let display: ReturnType<typeof mountBladeStage3D> | undefined;
    try {
      if (surface.current)
        display = mountBladeStage3D(
          surface.current,
          current,
          reportDisplayError,
        );
      stage.current = display ?? null;
    } catch {
      if (surface.current) surface.current.dataset.renderer = "unavailable";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reportDisplayError();
    }
    return () => {
      display?.dispose();
      stage.current = null;
      host.current = null;
      void current.dispose().catch(console.error);
    };
  }, [reportError, reportDisplayError]);
  return (
    <>
      <div className="plasma-stage catalog-gesture-stage">
        <div
          ref={surface}
          className="plasma-canvas"
          role="group"
          aria-label="Plasma blade stage"
          aria-describedby="plasma-help"
          tabIndex={ready && !displayError ? 0 : -1}
        />
        {displayError ? (
          <p className="plasma-display-error" role="alert">
            {displayError}
          </p>
        ) : null}
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
            disabled={state !== "running" || !!displayError}
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

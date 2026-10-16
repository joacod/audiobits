"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { mountLightsaber } from "../../../catalog/experiences/lightsaber/host";
import { mountBladeStage3D } from "./lightsaber-stage";
import "./lightsaber.css";
import { bindAudioGestures } from "../lib/audio-gestures";

const subscribeHydration = () => () => {};

export function LightsaberDetail() {
  const surface = useRef<HTMLDivElement>(null);
  const stage = useRef<ReturnType<typeof mountBladeStage3D> | null>(null);
  const [state, setState] = useState("stopped");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [error, setError] = useState("");
  const [displayError, setDisplayError] = useState("");
  const reportError = useCallback((cause: unknown) => {
    const message = cause instanceof Error ? cause.message : String(cause);
    setError(
      message.includes("Retry Play")
        ? "Audio did not start. Hold the stage again to retry."
        : `${message}. Hold the stage again to retry.`,
    );
  }, []);
  const reportDisplayError = useCallback(() => {
    setDisplayError(
      "The 3D display is unavailable. Hold and move here to hear the blade. Release to retract. Reload to retry the display.",
    );
  }, []);
  useEffect(() => {
    const current = mountLightsaber({
      state(value) {
        setState(value);
        if (value === "starting") setError("");
        stage.current?.stateChanged();
      },
      error: reportError,
    });
    const display = surface.current
      ? mountBladeStage3D(surface.current, current, reportDisplayError)
      : undefined;
    stage.current = display ?? null;
    const unbind = surface.current
      ? bindAudioGestures(
          surface.current,
          current.audio,
          current.stop,
          reportError,
        )
      : undefined;
    return () => {
      unbind?.();
      display?.dispose();
      stage.current = null;
      void current.dispose().catch(console.error);
    };
  }, [reportError, reportDisplayError]);
  return (
    <>
      <div className="lightsaber-stage catalog-gesture-stage audio-gesture-surface">
        <div
          ref={surface}
          className="lightsaber-canvas audio-gesture-surface"
          role="group"
          aria-label="Lightsaber stage"
          aria-describedby="lightsaber-help"
          tabIndex={ready ? 0 : -1}
        />
        {displayError ? (
          <p className="lightsaber-display-error" role="alert">
            {displayError}
          </p>
        ) : null}
        <div className="lightsaber-stage-caption" aria-hidden="true">
          <span>
            {state === "stopped"
              ? "Hold to ignite"
              : state === "starting"
                ? "Activating audio…"
                : displayError
                  ? "Move to swing. Release to retract."
                  : "Move. Cut through the field."}
          </span>
          <span>Procedural audio · No samples</span>
        </div>
      </div>
      <div className="lightsaber-help">
        <p id="lightsaber-help">
          {displayError
            ? "Hold to ignite. Move to swing. Release to retract."
            : "Hold to ignite. Drag through the amber targets. Release to retract. Targets return after a few seconds."}{" "}
          Keyboard: Enter ignites, arrows move,{" "}
          {displayError ? "" : "Space strikes, "}Escape retracts.
        </p>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    </>
  );
}

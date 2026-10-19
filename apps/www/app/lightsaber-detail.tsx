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
import { bindAudioGestures, prepareAudioPlayback } from "../lib/audio-gestures";
import {
  audioErrorMessage,
  formatAudioActivationReport,
} from "../lib/audio-activation-report";
import { AudioActivationReport } from "./audio-activation-report";
import { takeExperienceAudio } from "../lib/experience-audio";

const subscribeHydration = () => () => {};
const touchInputQuery = "(hover: none) and (pointer: coarse)";
function subscribeTouchInput(changed: () => void) {
  const query = window.matchMedia(touchInputQuery);
  query.addEventListener("change", changed);
  return () => query.removeEventListener("change", changed);
}
const hasTouchInput = () => window.matchMedia(touchInputQuery).matches;

export function LightsaberDetail({
  requireTouchActivation = false,
}: {
  requireTouchActivation?: boolean;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const host = useRef<ReturnType<typeof mountLightsaber> | null>(null);
  const focusAfterActivation = useRef(false);
  const stage = useRef<ReturnType<typeof mountBladeStage3D> | null>(null);
  const [audioReady, setAudioReady] = useState(!requireTouchActivation);
  const [activating, setActivating] = useState(false);
  const [state, setState] = useState("stopped");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const touchInput = useSyncExternalStore(
    subscribeTouchInput,
    hasTouchInput,
    () => false,
  );
  const [error, setError] = useState("");
  const [report, setReport] = useState("");
  const lastFailure = useRef<unknown>(undefined);
  const [displayError, setDisplayError] = useState("");
  const reportError = useCallback(
    (cause: unknown, retry = "Hold the stage again to retry.") => {
      lastFailure.current = cause;
      setError(`${audioErrorMessage(cause)} ${retry}`);
      setReport(formatAudioActivationReport(cause, surface.current));
    },
    [],
  );
  const reportDisplayError = useCallback(() => {
    setDisplayError(
      "The 3D display is unavailable. Hold and move here to hear the blade. Release to retract. Reload to retry the display.",
    );
  }, []);
  useEffect(() => {
    const prepared = takeExperienceAudio("lightsaber", surface.current);
    const current = mountLightsaber(
      {
        state(value) {
          setState(value);
          if (value === "starting") setError("");
          stage.current?.stateChanged();
        },
        error: reportError,
      },
      prepared,
    );
    host.current = current;
    const unsubscribe = current.audio.subscribe((value) => {
      if (value === "running") setAudioReady(true);
    });
    // Navigation may have already activated this same engine before mounting.
    if (current.audio.state === "running") setAudioReady(true);
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
          () => setError(""),
        )
      : undefined;
    return () => {
      host.current = null;
      unsubscribe();
      unbind?.();
      display?.dispose();
      stage.current = null;
      void current.dispose().catch(console.error);
    };
  }, [reportError, reportDisplayError]);
  useEffect(() => {
    if (audioReady && focusAfterActivation.current) {
      focusAfterActivation.current = false;
      surface.current?.focus({ preventScroll: true });
    }
  }, [audioReady]);

  async function activate() {
    const current = host.current;
    if (!current || activating) return;
    focusAfterActivation.current = true;
    setActivating(true);
    setError("");
    try {
      // Start the stage's real engine inside the completed button click.
      // Activation alone must never ignite the blade or schedule a sound.
      prepareAudioPlayback();
      await current.audio.start();
      if (host.current !== current) return;
      setAudioReady(true);
      setActivating(false);
    } catch (cause) {
      if (host.current !== current) return;
      reportError(cause, "Tap Use the Force to retry.");
      setActivating(false);
    }
  }

  const locked = requireTouchActivation && touchInput && !audioReady;
  return (
    <>
      <div className="lightsaber-stage catalog-gesture-stage audio-gesture-surface">
        <div
          ref={surface}
          className="lightsaber-canvas audio-gesture-surface"
          role="group"
          aria-label="Lightsaber stage"
          aria-describedby="lightsaber-help"
          tabIndex={ready && !locked ? 0 : -1}
          inert={locked}
        />
        {locked ? (
          <div className="lightsaber-activation">
            <button
              type="button"
              disabled={!ready || activating}
              aria-busy={activating}
              onClick={activate}
            >
              <span>{activating ? "Connecting…" : "Use the Force"}</span>
            </button>
          </div>
        ) : null}
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
        <AudioActivationReport
          error={error}
          report={report}
          onRefresh={() =>
            setReport(
              formatAudioActivationReport(lastFailure.current, surface.current),
            )
          }
        />
      </div>
    </>
  );
}

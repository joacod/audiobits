"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mountGroove } from "../../../catalog/experiences/groove-mixer/host";
import {
  defaultGrooveMix,
  type MixChannel,
  type GrooveMix,
} from "../../../catalog/experiences/groove-mixer/controller";
import { bindAudioGestures } from "../lib/audio-gestures";
import { takeExperienceAudio } from "../lib/experience-audio";
import { mountGrooveField } from "./groove-field";
import { OutputScope } from "./output-scope";
import { CatalogInstall } from "./catalog-install";
import { UsageCode } from "./usage-code";
import "./groove.css";

export function GrooveMixerDetail({ code }: { code: string }) {
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<ReturnType<typeof mountGroove> | null>(null);
  const field = useRef<ReturnType<typeof mountGrooveField> | null>(null);
  const [state, setState] = useState<"stopped" | "starting" | "playing">(
    "stopped",
  );
  const [mix, setMix] = useState<GrooveMix>(defaultGrooveMix);
  const [error, setError] = useState("");
  const engine = useCallback(() => host.current?.audio ?? null, []);
  useEffect(() => {
    if (!surface.current || !canvas.current) return;
    const fail = (cause: unknown) =>
      setError(
        `${cause instanceof Error ? cause.message : "Audio could not start"}. Tap the stage to retry.`,
      );
    const mounted = mountGroove(
      (value) => {
        setState(value);
        field.current?.draw();
      },
      fail,
      takeExperienceAudio("groove-mixer", surface.current),
    );
    host.current = mounted;
    field.current = mountGrooveField(canvas.current, mounted.groove);
    const gestures = bindAudioGestures(
      surface.current,
      mounted.audio,
      mounted.stop,
      fail,
    );
    return () => {
      gestures();
      field.current?.dispose();
      field.current = null;
      host.current = null;
      void mounted.dispose().catch(console.error);
    };
  }, []);
  function update(
    channel: MixChannel,
    settings: { level?: number; muted?: boolean },
  ) {
    try {
      host.current?.groove.setMix(channel, settings);
      if (host.current) setMix(host.current.groove.mix);
      field.current?.draw();
    } catch {
      setError(
        "The mix could not change. Stop the groove and tap again to retry.",
      );
    }
  }
  const usage = code.replace(
    "let request = 0;",
    `${(["drums", "bass", "master"] as const).map((channel) => `groove.setMix("${channel}", ${JSON.stringify(mix[channel])});`).join("\n")}\nlet request = 0;`,
  );
  return (
    <>
      <div
        ref={surface}
        className="groove-experience"
        onKeyDown={(event) => {
          if (event.key === "Escape") host.current?.stop();
        }}
      >
        <button
          type="button"
          className="groove-stage catalog-gesture-stage audio-gesture-surface"
          aria-label={state === "stopped" ? "Play groove" : "Stop groove"}
          aria-describedby="groove-help"
          aria-pressed={state !== "stopped"}
          onClick={() => {
            setError("");
            if (state === "stopped") void host.current?.start();
            else host.current?.stop();
          }}
        >
          <canvas ref={canvas} aria-hidden="true" />
          <span className="groove-stage-meta">
            <span>120 BPM</span>
            <span>Drums + bass</span>
            <span>2 bar loop</span>
          </span>
          {state === "stopped" ? (
            <span className="groove-invitation">
              <strong>
                Find your
                <br />
                pocket.
              </strong>
              <span>Tap to drop the groove</span>
            </span>
          ) : null}
          <span className="groove-stage-footer">
            <span>
              {state === "starting"
                ? "Opening audio…"
                : state === "playing"
                  ? "In the pocket. Tap to stop."
                  : "One beat. Your balance."}
            </span>
            <span>Rhythm / Harmony</span>
          </span>
        </button>
        <div className="groove-mix" aria-label="Groove mix">
          {(["drums", "bass", "master"] as const).map((channel) => (
            <div
              className="groove-channel"
              data-channel={channel}
              data-muted={mix[channel].muted || mix[channel].level === 0}
              key={channel}
            >
              <label htmlFor={`groove-${channel}`}>
                <span>
                  {channel === "drums"
                    ? "Drums"
                    : channel === "bass"
                      ? "Bass"
                      : "Master"}
                </span>
                <output>
                  {Math.round(mix[channel].level * 100)}
                  <small>%</small>
                </output>
              </label>
              <p>
                {channel === "drums"
                  ? "The pulse"
                  : channel === "bass"
                    ? "The movement"
                    : "The whole groove"}
              </p>
              <input
                id={`groove-${channel}`}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mix[channel].level}
                aria-valuetext={`${Math.round(mix[channel].level * 100)}%`}
                onChange={(event) =>
                  update(channel, { level: Number(event.target.value) })
                }
              />
              <button
                type="button"
                aria-label={`${mix[channel].muted ? "Unmute" : "Mute"} ${channel}`}
                aria-pressed={mix[channel].muted}
                onClick={() => update(channel, { muted: !mix[channel].muted })}
              >
                {mix[channel].muted ? "Unmute" : "Mute"}
              </button>
            </div>
          ))}
        </div>
        <div className="groove-output">
          <span>Live output</span>
          <OutputScope
            engine={engine}
            active={state === "playing"}
            family="harmonic"
            measured
          />
        </div>
        <div className="groove-help">
          <p id="groove-help">
            Bring the bass forward. Let the drums breathe. Adjust each level or
            mute a part to hear how they lock together. Tap the stage or press
            Enter to play and stop. Escape stops.
          </p>
          <p role="status">
            {state === "playing"
              ? mix.master.muted || mix.master.level === 0
                ? "Playing. Master is silent."
                : "Groove playing."
              : state === "starting"
                ? "Starting audio."
                : "Groove stopped."}
          </p>
          {error ? <p role="alert">{error}</p> : null}
        </div>
      </div>
      <CatalogInstall slug="groove-mixer">
        <UsageCode slug="groove-mixer" code={usage} />
      </CatalogInstall>
    </>
  );
}

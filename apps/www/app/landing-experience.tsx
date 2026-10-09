"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@base-ui/react/button";
import type { AudioEngine } from "audiobits";
import {
  soundInfo,
  sounds,
  parameterLabel,
  parameterEndpoints,
  type SoundKind,
} from "../lib/gallery";
import { OutputScope } from "./output-scope";
import { PlaySpark } from "./play-spark";

const choices: SoundKind[] = ["glass-notification", "impact", "thruster"];

export function LandingExperience({
  engine,
  ready,
  controls,
  playing,
  error,
  muted,
  onPlay,
  onStop,
  onUpdateControl,
  onMute,
}: {
  engine: AudioEngine | null;
  ready: boolean;
  controls: Record<SoundKind, Record<string, number>>;
  playing: Partial<Record<SoundKind, string>>;
  error: string;
  muted: boolean;
  onPlay(kind: SoundKind): Promise<void>;
  onStop(): void;
  onUpdateControl(kind: SoundKind, name: string, value: number): void;
  onMute(): void;
}) {
  const [selected, setSelected] = useState<SoundKind>("glass-notification");
  const [copy, setCopy] = useState("");
  const info = soundInfo[selected];
  const sustained = sounds[selected].kind === "sustained";
  const status = playing[selected] ?? "ready";
  const active = status === "running" || status === "playing";
  const example = `import { createAudio } from "audiobits";
import { ${info.exportName} } from "audiobits/recipes";

const audio = createAudio();
const sound = audio.sound(${info.exportName});
let request = 0;${sustained ? "\nlet voice: ReturnType<typeof sound.play> | undefined;" : ""}

// Call directly from a click, tap, or keyboard gesture.
export async function play() {
  const token = ++request;
  await audio.start();
  if (token !== request || document.hidden) return;
  audio.stopAll({ tails: "cut" });
  ${sustained ? "voice = " : ""}sound.play({ parameters: ${JSON.stringify(controls[selected])}, seed: 42 });
}
${sustained ? "\n// Live control while the voice is active.\nexport function setThrottle(throttle: number) { if (voice?.state === 'active') voice.set({ throttle }); }\n" : ""}
export function stop() { request++; audio.stopAll({ tails: "cut" }); }
// Call when your component unmounts or your page leaves.
export async function dispose() { stop(); await audio.dispose(); }`;

  return (
    <>
      <section
        className="landing-stage"
        aria-label="Interactive sound stage"
        data-playing={active}
      >
        <div
          className="stage-selectors"
          role="group"
          aria-label="Choose a sound"
        >
          {choices.map((kind) => (
            <Button
              key={kind}
              aria-pressed={selected === kind}
              disabled={!ready}
              onClick={() => {
                onStop();
                setSelected(kind);
                setCopy("");
              }}
            >
              {kind === "glass-notification" ? "Glass" : soundInfo[kind].title}
              <span>
                {sounds[kind].kind === "sustained" ? "Sustained" : "One-shot"}
              </span>
            </Button>
          ))}
          <span className="stage-caption">Real sound. Generated here.</span>
        </div>
        <div className="stage-body">
          <div className="stage-signal">
            <OutputScope
              engine={engine}
              active={active}
              family={info.visualFamily}
            />
            <p className="stage-idle-note">
              {active
                ? "Live signal shapes these lines"
                : "A silent portrait. Press Play to bring it alive."}
            </p>
          </div>
          <div className="stage-instrument">
            <div className="stage-title">
              <h2>{info.title}</h2>
              <p role="status" data-testid="landing-playback-state">
                {info.title}: {error ? "error" : status}
              </p>
            </div>
            <p className="stage-description">
              {selected === "glass-notification"
                ? "A delicate chime with a bright glass rim."
                : selected === "impact"
                  ? "From a soft contact to a heavy collision."
                  : "Start the engine. Shape its thrust as it runs."}
            </p>
            <div className="stage-actions">
              <PlaySpark>
                <Button
                  className="play-action"
                  disabled={
                    !ready || status === "starting" || (sustained && active)
                  }
                  onClick={() => void onPlay(selected)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path d="M4 2 14 8 4 14Z" fill="currentColor" />
                  </svg>
                  {status === "starting"
                    ? "Starting…"
                    : `${sustained ? "Start" : "Play"} ${selected === "glass-notification" ? "glass" : selected}`}
                </Button>
              </PlaySpark>
              <Button disabled={!ready} onClick={onStop}>
                Stop
              </Button>
              <Button disabled={!ready} aria-pressed={muted} onClick={onMute}>
                Mute
              </Button>
            </div>
            {Object.entries(sounds[selected].parameters ?? {}).map(
              ([name, parameter]) => (
                <label key={`${selected}-${name}`} className="stage-parameter">
                  <span>
                    {parameterLabel(selected, name)}{" "}
                    <output>{controls[selected][name].toFixed(2)}</output>
                  </span>
                  <input
                    type="range"
                    aria-label={parameterLabel(selected, name)}
                    disabled={!ready}
                    min={parameter.min}
                    max={parameter.max}
                    step={(parameter.max - parameter.min) / 100}
                    value={controls[selected][name]}
                    onChange={(event) => {
                      onUpdateControl(
                        selected,
                        name,
                        Number(event.target.value),
                      );
                      setCopy("");
                    }}
                  />
                  <span className="stage-endpoints" aria-hidden="true">
                    {parameterEndpoints(selected, name)?.map((endpoint) => (
                      <span key={endpoint}>{endpoint}</span>
                    ))}
                  </span>
                  <small>
                    {parameter.mode === "live"
                      ? "Changes this voice while it plays"
                      : "Applies on the next Play"}
                  </small>
                </label>
              ),
            )}
            <Link className="stage-workbench" href={`/sounds/${selected}`}>
              Explore this sound in the workbench{" "}
              <span aria-hidden="true">↗</span>
            </Link>
            {error && (
              <p role="alert" className="stage-error">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="landing-workflow" aria-labelledby="workflow-heading">
        <div className="workflow-copy">
          <h2 id="workflow-heading">
            Play it.
            <br />
            Shape it.
            <br />
            <em>Use it.</em>
          </h2>
          <p>
            The sound you just heard is a recipe. Keep its character, change its
            parameters, and bring it into your app.
          </p>
          <p>
            Ready-to-use sounds. Portable, versioned data. A typed library that
            handles playback and lifecycle.
          </p>
          <Link href="/docs">
            Your first sound, step by step <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="workflow-code">
          <div className="workflow-code-heading">
            <span>{info.title} · your settings</span>
            <Button
              disabled={!ready}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(example);
                  setCopy("Copied");
                } catch {
                  setCopy("Copy failed. Select the code to copy.");
                }
              }}
            >
              Copy code
            </Button>
          </div>
          <pre tabIndex={0} aria-label={`${info.title} integration code`}>
            <code>{example}</code>
          </pre>
          <div className="workflow-code-footnote">
            <p aria-live="polite">
              {copy || "Seed 42 · same recipe, reproducible variation"}
            </p>
            <p>
              Catch failed Play calls in your host UI. Stop and suspend when
              hidden; dispose on navigation.{" "}
              <Link href="/docs/lifecycle">Production lifecycle</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@base-ui/react/button";
import { useState } from "react";
import dynamic from "next/dynamic";
import { OutputScope } from "./output-scope";
import type { AudioEngine, Recipe } from "audiobits";
const RecipeTools = dynamic(() =>
  import("./recipe-tools").then((module) => module.RecipeTools),
);
import { PlaySpark } from "./play-spark";
import { soundInfo, parameterLabel, parameterEndpoints } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

export function SoundCard({
  kind,
  ready,
  recipe,
  controls,
  playing,
  workbench = false,
  engine,
  rawSource,
  onPlay,
  onStop,
  onUpdateControl,
  onReset,
  onSeed,
  onApply,
}: {
  kind: SoundKind;
  ready: boolean;
  recipe: Recipe;
  controls: Readonly<Record<string, number>>;
  playing?: string;
  workbench?: boolean;
  engine: AudioEngine | null;
  rawSource: string;
  onPlay(kind: SoundKind): Promise<void>;
  onStop(kind: SoundKind): void;
  onUpdateControl(kind: SoundKind, name: string, value: number): void;
  onReset(kind: SoundKind): void;
  onSeed(kind: SoundKind, seed: number | null): void;
  onApply(kind: SoundKind, recipe: Recipe): void;
}) {
  const [seed, setSeed] = useState("42");
  const seedValue = Number(seed);
  const validSeed =
    seed.trim() !== "" &&
    Number.isInteger(seedValue) &&
    seedValue >= 0 &&
    seedValue <= 0xffffffff;
  function changeSeed(value: string) {
    setSeed(value);
    const number = Number(value);
    onSeed(
      kind,
      value.trim() !== "" &&
        Number.isInteger(number) &&
        number >= 0 &&
        number <= 0xffffffff
        ? number
        : null,
    );
  }
  const info = soundInfo[kind];
  const sustained = recipe.kind === "sustained";
  const status = playing ?? (sustained ? "stopped" : "ready");
  return (
    <article
      className={`sound-card ${workbench ? "sound-workbench" : "compact-sound"}`}
      id={kind}
      key={kind}
    >
      {workbench && (
        <OutputScope
          engine={engine}
          active={status === "running" || status === "playing"}
          family={info.visualFamily}
        />
      )}
      <div className="sound-preview">
        <h3>
          <Link href={`/sounds/${kind}`}>{info.title}</Link>
        </h3>
        <p className="sound-use">{info.use}</p>
        <p>{info.description}</p>
        <div className="audio-controls">
          <PlaySpark>
            <Button
              className="play-action"
              disabled={
                !ready ||
                (sustained && (status === "starting" || status === "running"))
              }
              onClick={() => void onPlay(kind)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                aria-hidden="true"
              >
                <path d="M3 1.5 12 7 3 12.5Z" fill="currentColor" />
              </svg>
              {`${sustained ? "Start" : "Play"} ${kind}`}
            </Button>
          </PlaySpark>
          {sustained && (
            <Button onClick={() => onStop(kind)}>Stop {kind}</Button>
          )}
        </div>
        {Object.entries(recipe.parameters ?? {}).map(([name, parameter]) => (
          <label key={name}>
            {parameterLabel(kind, name)}: {controls[name]?.toFixed(2)}
            <input
              aria-label={parameterLabel(kind, name)}
              disabled={!ready}
              type="range"
              min={parameter.min}
              max={parameter.max}
              step={(parameter.max - parameter.min) / 100}
              value={controls[name] ?? parameter.default}
              onChange={(event) =>
                onUpdateControl(kind, name, Number(event.target.value))
              }
            />
            {parameterEndpoints(kind, name) && (
              <span className="morph-endpoints" aria-hidden="true">
                {parameterEndpoints(kind, name)?.map((endpoint) => (
                  <span key={endpoint}>{endpoint}</span>
                ))}
              </span>
            )}
            <span className="control-mode">
              {parameter.mode === "live"
                ? "Changes this voice while it plays"
                : "Applies on the next Play"}
            </span>
          </label>
        ))}
        <p data-testid={`${kind}-state`} aria-live="polite">
          {info.title}: {status}
        </p>
      </div>
      <div className="variation-controls">
        <label>
          Seed (next Play)
          <input
            aria-label={`${kind} seed`}
            disabled={!ready}
            type="number"
            min="0"
            max="4294967295"
            step="1"
            value={seed}
            onChange={(event) => changeSeed(event.target.value)}
          />
        </label>
        <div className="audio-controls">
          <Button
            disabled={!ready}
            onClick={() =>
              changeSeed(String(Math.floor(Math.random() * 0x100000000)))
            }
          >
            Randomize {kind}
          </Button>
          <Button disabled={!ready} onClick={() => changeSeed("42")}>
            Reset variation
          </Button>
        </div>
        {!validSeed && (
          <p role="alert">Seed must be an unsigned 32-bit integer.</p>
        )}
      </div>
      {workbench ? (
        <RecipeTools
          kind={kind}
          recipe={recipe}
          seed={validSeed ? seedValue : null}
          controls={controls}
          rawSource={rawSource}
          onReset={() => {
            onReset(kind);
            changeSeed("42");
          }}
          onApply={onApply}
        />
      ) : (
        <Link className="open-sound" href={`/sounds/${kind}`}>
          Open {info.title.toLowerCase()} workbench
        </Link>
      )}
    </article>
  );
}

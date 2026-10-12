"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@base-ui/react/button";
import { OutputScope } from "./output-scope";
import { PlaySpark } from "./play-spark";
import { SoundMark } from "../icons/catalog-marks";
import { PlayIcon } from "../icons/play-icon";
import { CatalogInstall } from "./catalog-install";
import { useCollectionSession } from "./collection-session";
import { parameterEndpoints, parameterLabel, soundInfo } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

const RecipeTools = dynamic(() =>
  import("./recipe-tools").then((module) => module.RecipeTools),
);

// One collection session per mounted entry. A new slug remounts and disposes it.
export function CatalogSoundBench({
  slug,
  markIndex,
  rawSource,
}: {
  slug: SoundKind;
  markIndex: number;
  rawSource: string;
}) {
  return (
    <SoundSession
      key={slug}
      slug={slug}
      markIndex={markIndex}
      rawSource={rawSource}
    />
  );
}

function SoundSession({
  slug,
  markIndex,
  rawSource,
}: {
  slug: SoundKind;
  markIndex: number;
  rawSource: string;
}) {
  const {
    ready,
    recipes,
    controls,
    playing,
    volume,
    engine,
    state,
    error,
    muted,
    play,
    stop,
    stopAll,
    updateControl,
    resetControl,
    setSeed,
    applyRecipe,
    toggleMuted,
    changeVolume,
  } = useCollectionSession();
  const [seed, setSeedText] = useState("42");
  const [levels, setLevels] = useState(false);
  const recipe = recipes[slug];
  const values = controls[slug];
  const info = soundInfo[slug];
  const sustained = recipe.kind === "sustained";
  const status = playing[slug] ?? (sustained ? "stopped" : "ready");
  const seedValue = Number(seed);
  const validSeed =
    seed.trim() !== "" &&
    Number.isInteger(seedValue) &&
    seedValue >= 0 &&
    seedValue <= 0xffffffff;
  const parameters = Object.entries(recipe.parameters ?? {});
  const primary = parameters[0];
  const drive = primary
    ? driveRatio(
        values[primary[0]] ?? primary[1].default,
        primary[1].min,
        primary[1].max,
      )
    : null;

  function changeSeed(value: string) {
    setSeedText(value);
    const number = Number(value);
    setSeed(
      slug,
      value.trim() !== "" &&
        Number.isInteger(number) &&
        number >= 0 &&
        number <= 0xffffffff
        ? number
        : null,
    );
  }

  return (
    <>
      <div
        className={`catalog-stage catalog-stage-${info.visualFamily}`}
        style={
          drive === null
            ? undefined
            : ({ "--drive": drive.toFixed(4) } as CSSProperties)
        }
      >
        <div className="catalog-stage-field">
          <div className="catalog-stage-mark" aria-hidden="true">
            <SoundMark family={info.visualFamily} index={markIndex} />
          </div>
          <OutputScope
            engine={engine}
            active={status === "running" || status === "playing"}
            family={info.visualFamily}
            measured
          />
        </div>
        {drive !== null && primary && (
          <p className="catalog-drive">
            Control position · {parameterLabel(slug, primary[0])}{" "}
            {Math.round(drive * 100)}%
          </p>
        )}
      </div>
      <div className="catalog-playback">
        <div
          className="catalog-transport"
          role="group"
          aria-label="Playback"
          data-levels={levels ? "open" : "closed"}
          aria-busy={ready ? undefined : true}
        >
          <div className="audio-controls">
            <PlaySpark>
              <Button
                className="play-action"
                disabled={
                  !ready ||
                  (sustained && (status === "starting" || status === "running"))
                }
                onClick={() => void play(slug)}
              >
                <PlayIcon />
                {`${sustained ? "Start" : "Play"} ${info.title.toLowerCase()}`}
              </Button>
            </PlaySpark>
            {sustained && (
              <Button onClick={() => stop(slug)}>
                Stop {info.title.toLowerCase()}
              </Button>
            )}
            <Button
              disabled={!ready}
              aria-pressed={muted}
              onClick={toggleMuted}
            >
              Mute
            </Button>
            <Button disabled={!ready} onClick={stopAll}>
              Stop all
            </Button>
            <Button
              className="catalog-levels"
              aria-expanded={levels}
              aria-controls="catalog-volume"
              onClick={() => setLevels((open) => !open)}
            >
              {levels ? "Less" : "Levels"}
            </Button>
          </div>
          <p data-testid={`${slug}-state`} aria-live="polite">
            {info.title}: {status}
          </p>
          <p role="status">Audio: {state}</p>
          {error && <p role="alert">{error}</p>}
          <label id="catalog-volume" className="catalog-volume">
            Effects volume: {volume} dB
            <input
              aria-label="Effects volume"
              disabled={!ready}
              type="range"
              min="-60"
              max="0"
              step="1"
              value={volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="catalog-parameters">
          <h2>Customize</h2>
          {parameters.length > 0 && (
            <div role="group" aria-label="Sound controls">
              {parameters.map(([name, parameter]) => (
                <label key={name}>
                  {parameterLabel(slug, name)}: {values[name]?.toFixed(2)}
                  <input
                    aria-label={parameterLabel(slug, name)}
                    disabled={!ready}
                    type="range"
                    min={parameter.min}
                    max={parameter.max}
                    step={(parameter.max - parameter.min) / 100}
                    value={values[name] ?? parameter.default}
                    onChange={(event) =>
                      updateControl(slug, name, Number(event.target.value))
                    }
                  />
                  {parameterEndpoints(slug, name) && (
                    <span className="morph-endpoints" aria-hidden="true">
                      {parameterEndpoints(slug, name)?.map((endpoint) => (
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
            </div>
          )}
          <div
            className="variation-controls"
            role="group"
            aria-label="Variation"
          >
            <label>
              Seed (next Play)
              <input
                aria-label={`${slug} seed`}
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
                Randomize {info.title.toLowerCase()}
              </Button>
              <Button disabled={!ready} onClick={() => changeSeed("42")}>
                Reset variation
              </Button>
            </div>
            {!validSeed && (
              <p role="alert">Seed must be an unsigned 32-bit integer.</p>
            )}
          </div>
        </div>
      </div>
      <CatalogInstall slug={slug} />
      <div className="catalog-inspector">
        <h2>Inspect source</h2>
        <RecipeTools
          kind={slug}
          recipe={recipe}
          seed={validSeed ? seedValue : null}
          controls={values}
          rawSource={rawSource}
          onReset={() => {
            resetControl(slug);
            changeSeed("42");
          }}
          onApply={applyRecipe}
        />
      </div>
    </>
  );
}

function driveRatio(value: number, min: number, max: number) {
  const span = max - min;
  if (span === 0) return 0;
  return Math.min(1, Math.max(0, (value - min) / span));
}

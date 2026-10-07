import Link from "next/link";
import { Button } from "@base-ui/react/button";
import type { Recipe } from "audiobits";
import { RecipeTools } from "./recipe-tools";
import { PlaySpark } from "./play-spark";
import { soundInfo, parameterLabel, parameterEndpoints } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

export function SoundCard({
  kind,
  recipe,
  controls,
  playing,
  featured = false,
  rawSource,
  onPlay,
  onStop,
  onUpdateControl,
  onReset,
  onSeed,
  onApply,
}: {
  kind: SoundKind;
  recipe: Recipe;
  controls: Readonly<Record<string, number>>;
  playing?: string;
  featured?: boolean;
  rawSource: string;
  onPlay(kind: SoundKind): Promise<void>;
  onStop(kind: SoundKind): void;
  onUpdateControl(kind: SoundKind, name: string, value: number): void;
  onReset(kind: SoundKind): void;
  onSeed(kind: SoundKind, seed: number | null): void;
  onApply(kind: SoundKind, recipe: Recipe): void;
}) {
  const info = soundInfo[kind];
  const sustained = recipe.kind === "sustained";
  const status = playing ?? (sustained ? "stopped" : "ready");
  return (
    <article
      className={`sound-card ${featured ? "flagship-sound" : ""}`}
      id={kind}
      key={kind}
    >
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
                sustained && (status === "starting" || status === "running")
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
              {sustained ? "Start" : "Play"} {kind}
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
      {featured ? (
        <div className="flagship-code">
          <p>Make it yours. Then take the code.</p>
          <pre>
            <code>{`const hit = audio.sound(impact);
hit.play({
  parameters: { intensity: ${controls.intensity?.toFixed(2)} }
});`}</code>
          </pre>
          <Link href="/sounds/impact">Recipe, variation & full example</Link>
        </div>
      ) : (
        <RecipeTools
          kind={kind}
          controls={controls}
          rawSource={rawSource}
          onReset={onReset}
          onSeed={onSeed}
          onApply={onApply}
        />
      )}
    </article>
  );
}

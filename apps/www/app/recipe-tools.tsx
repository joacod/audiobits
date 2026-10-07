"use client";

import { memo, useMemo, useState } from "react";
import { Button } from "@base-ui/react/button";
import { validateRecipe } from "audiobits";
import type { Recipe } from "audiobits";
import { libraryExample, rawHost, sounds } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

export const RecipeTools = memo(function RecipeTools({
  kind,
  control,
  rawSource,
  onApply,
  onSeed,
  onReset,
}: {
  kind: SoundKind;
  control: number;
  rawSource: string;
  onApply(kind: SoundKind, recipe: Recipe): void;
  onSeed(kind: SoundKind, seed: number | null): void;
  onReset(kind: SoundKind): void;
}) {
  const [recipe, setRecipe] = useState<Recipe>(sounds[kind]);
  const [draft, setDraft] = useState(() =>
    JSON.stringify(sounds[kind], null, 2),
  );
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [seed, setSeed] = useState("42");
  const [copyState, setCopyState] = useState("");
  const seedValue = Number(seed);
  const validSeed =
    seed.trim() !== "" &&
    Number.isInteger(seedValue) &&
    seedValue >= 0 &&
    seedValue <= 0xffffffff;
  const exampleSeed = validSeed ? seedValue : 42;
  const example = useMemo(
    () => libraryExample(recipe, control, exampleSeed),
    [recipe, control, exampleSeed],
  );
  const original = useMemo(
    () => JSON.stringify(recipe) === JSON.stringify(sounds[kind]),
    [recipe, kind],
  );
  function apply() {
    if (new TextEncoder().encode(draft).byteLength > 32768) {
      setIssues(["$: Recipe text is limited to 32 KiB."]);
      return;
    }
    try {
      const result = validateRecipe(JSON.parse(draft));
      if (!result.ok) {
        setIssues(
          result.issues
            .slice(0, 10)
            .map((issue) => `${issue.path}: ${issue.message}`),
        );
        return;
      }
      // The curated card keeps its primary control contract. Other parameters use defaults.
      const name =
        kind === "impact"
          ? "intensity"
          : kind === "thruster"
            ? "throttle"
            : undefined;
      const declaration = name ? result.recipe.parameters?.[name] : undefined;
      if (
        result.recipe.kind !== sounds[kind].kind ||
        (name &&
          (!declaration ||
            declaration.min !== 0 ||
            declaration.max !== 1 ||
            declaration.default !== (kind === "impact" ? 0.5 : 0.2) ||
            declaration.mode !== (kind === "impact" ? "play" : "live")))
      ) {
        setIssues([
          "$: Keep this card's playback kind and primary parameter contract (range, default, and mode).",
        ]);
        return;
      }
      onApply(kind, result.recipe);
      setRecipe(result.recipe);
      setIssues([]);
      setCopyState("Recipe applied. Play to hear the new definition.");
    } catch (cause) {
      setIssues([
        `$: ${cause instanceof Error ? cause.message : "Invalid JSON."}`,
      ]);
    }
  }
  function restore() {
    onApply(kind, sounds[kind]);
    onReset(kind);
    setRecipe(sounds[kind]);
    setDraft(JSON.stringify(sounds[kind], null, 2));
    setIssues([]);
    setSeed("42");
    onSeed(kind, 42);
    setCopyState("Bundled recipe and defaults restored.");
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("Copied.");
    } catch {
      setCopyState(
        "Clipboard unavailable. Select the displayed code and copy it manually.",
      );
    }
  }
  return (
    <div className="recipe-tools">
      <label>
        Seed (next Play)
        <input
          aria-label={`${kind} seed`}
          type="number"
          min="0"
          max="4294967295"
          step="1"
          value={seed}
          onChange={(event) => {
            setSeed(event.target.value);
            const value = Number(event.target.value);
            onSeed(
              kind,
              event.target.value.trim() !== "" &&
                Number.isInteger(value) &&
                value >= 0 &&
                value <= 0xffffffff
                ? value
                : null,
            );
            setCopyState("");
          }}
        />
      </label>
      {!validSeed && (
        <p role="alert">Seed must be an unsigned 32-bit integer.</p>
      )}
      <Button disabled={!validSeed} onClick={() => void copy(example)}>
        Copy {kind} example
      </Button>
      <Button onClick={restore}>Reset {kind}</Button>
      <p aria-live="polite">{copyState}</p>
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Recipe &amp; code · {kind}</summary>
        {open && (
          <>
            <label>
              Recipe JSON (32 KiB maximum)
              <textarea
                aria-label={`${kind} recipe JSON`}
                spellCheck={false}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <div className="audio-controls">
              <Button onClick={apply}>Apply {kind} recipe</Button>
              <Button onClick={restore}>Restore {kind} recipe</Button>
            </div>
            {!!issues.length && (
              <div role="alert">
                <p>Not applied. The last valid recipe remains playable.</p>
                <ul>
                  {issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <h4>AudioBits · current configuration</h4>
            <p>
              The sound parameters and seed below match the next Play. Global
              mixer settings are separate.
            </p>
            <pre>
              <code>{example}</code>
            </pre>
            <h4>Raw Web Audio · bundled {kind}</h4>
            <p>
              Equivalent dry sound, seeded noise, live smoothing, release, and
              cleanup for the bundled definition. Both examples use -12 dB
              master gain. Shared delay and voice stealing are library features
              outside this single-voice comparison.
            </p>
            {original ? (
              <>
                <Button
                  onClick={() =>
                    void copy(
                      `${rawSource}\n${rawHost(kind, control, seedValue)}`,
                    )
                  }
                  disabled={!validSeed}
                >
                  Copy raw {kind} example
                </Button>
                <pre>
                  <code>
                    {rawSource}
                    {"\n"}
                    {rawHost(kind, control, validSeed ? seedValue : 42)}
                  </code>
                </pre>
              </>
            ) : (
              <p>
                Restore the bundled recipe to view its raw comparison. Edited
                recipes are represented by the current AudioBits example above.
              </p>
            )}
          </>
        )}
      </details>
    </div>
  );
});

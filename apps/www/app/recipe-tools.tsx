"use client";

import { memo, useState, useSyncExternalStore } from "react";
import { Button } from "@base-ui/react/button";
import { CatalogInstall } from "./catalog-install";
import { UsageCode } from "./usage-code";
import { LiveCodeBlock } from "./live-code-block";
import { validateRecipe } from "audiobits";
import type { Recipe } from "audiobits";
import { sounds, quickExample } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

const subscribeHydration = () => () => {};

export const RecipeTools = memo(function RecipeTools({
  kind,
  recipe,
  seed,
  controls,
  onApply,
  onReset,
}: {
  kind: SoundKind;
  recipe: Recipe;
  seed: number | null;
  controls: Readonly<Record<string, number>>;
  onApply(kind: SoundKind, recipe: Recipe): void;
  onReset(): void;
}) {
  const [draft, setDraft] = useState(() => JSON.stringify(recipe, null, 2));
  const [editing, setEditing] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [copyState, setCopyState] = useState("");
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const example = quickExample(kind, controls, seed ?? 42, recipe);
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
      if (result.recipe.kind !== sounds[kind].kind) {
        setIssues([
          "$: Keep this sound's one-shot or sustained playback kind.",
        ]);
        return;
      }
      onApply(kind, result.recipe);
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
    onReset();
    setDraft(JSON.stringify(sounds[kind], null, 2));
    setIssues([]);
    setCopyState("Catalog recipe and defaults restored.");
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
    <>
      <CatalogInstall slug={kind}>
        <UsageCode slug={kind} code={example} disabled={seed === null} />
      </CatalogInstall>
      <section className="catalog-inspector recipe-tools">
        <h2>Customize or inspect</h2>
        <details>
          <summary>Recipe</summary>
          <p>
            Apply valid JSON edits to hear and copy them. Copy Recipe returns
            the applied definition; the Add command installs catalog defaults.
          </p>
          <div className="audio-controls">
            <Button
              disabled={!ready}
              onClick={() => void copy(JSON.stringify(recipe, null, 2))}
            >
              Copy {kind} recipe
            </Button>
            <Button
              disabled={!ready}
              aria-pressed={editing}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "View recipe" : "Edit recipe"}
            </Button>
            <Button disabled={!ready} onClick={restore}>
              Restore {kind} recipe
            </Button>
          </div>
          {editing ? (
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
              <Button onClick={apply}>Apply {kind} recipe</Button>
            </>
          ) : (
            <LiveCodeBlock code={JSON.stringify(recipe, null, 2)} lang="json" />
          )}
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
          <p aria-live="polite">{copyState}</p>
        </details>
      </section>
    </>
  );
});

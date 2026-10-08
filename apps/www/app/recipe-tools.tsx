"use client";

import Link from "next/link";
import { memo, useMemo, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Tabs } from "@base-ui/react/tabs";
import { validateRecipe } from "audiobits";
import type { Recipe } from "audiobits";
import {
  libraryExample,
  rawHost,
  sounds,
  hasRawComparison,
  quickExample,
} from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

export const RecipeTools = memo(function RecipeTools({
  kind,
  recipe,
  seed,
  controls,
  rawSource,
  onApply,
  onReset,
}: {
  kind: SoundKind;
  recipe: Recipe;
  seed: number | null;
  controls: Readonly<Record<string, number>>;
  rawSource: string;
  onApply(kind: SoundKind, recipe: Recipe): void;
  onReset(): void;
}) {
  const [draft, setDraft] = useState(() => JSON.stringify(recipe, null, 2));
  const [editing, setEditing] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [copyState, setCopyState] = useState("");
  const original = useMemo(
    () => JSON.stringify(recipe) === JSON.stringify(sounds[kind]),
    [recipe, kind],
  );
  const example = useMemo(
    () =>
      original
        ? quickExample(kind, controls, seed ?? 42)
        : libraryExample(recipe, controls, seed ?? 42),
    [original, kind, recipe, controls, seed],
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
      <Tabs.Root defaultValue="code">
        <Tabs.List aria-label="Sound inspector" className="inspector-tabs">
          <Tabs.Tab value="code">Code</Tabs.Tab>
          <Tabs.Tab value="recipe">Recipe</Tabs.Tab>
          {hasRawComparison(kind) && (
            <Tabs.Tab value="raw">Raw Web Audio</Tabs.Tab>
          )}
        </Tabs.List>
        <Tabs.Panel value="code">
          <h3>Take this sound.</h3>
          <p>Current parameters and seed. Mixer settings are separate.</p>
          <Button disabled={seed === null} onClick={() => void copy(example)}>
            Copy {kind} code
          </Button>
          <pre>
            <code>{example}</code>
          </pre>
          <Link href="/docs/lifecycle">Production lifecycle</Link>
        </Tabs.Panel>
        <Tabs.Panel value="recipe">
          <div className="audio-controls">
            <Button onClick={() => void copy(JSON.stringify(recipe, null, 2))}>
              Copy {kind} recipe
            </Button>
            <Button aria-pressed={editing} onClick={() => setEditing(!editing)}>
              {editing ? "View recipe" : "Edit recipe"}
            </Button>
            <Button onClick={restore}>Restore {kind} recipe</Button>
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
            <pre>
              <code>{JSON.stringify(recipe, null, 2)}</code>
            </pre>
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
        </Tabs.Panel>
        {hasRawComparison(kind) && (
          <Tabs.Panel value="raw">
            <h3>Raw Web Audio · bundled {kind}</h3>
            <p>
              Equivalent dry sound, seeded noise, live smoothing, release and
              cleanup for the bundled definition. Both examples use -12 dB
              master gain. Voice stealing is outside this single-voice
              comparison.
            </p>
            {original ? (
              <>
                <Button
                  disabled={seed === null}
                  onClick={() =>
                    void copy(
                      `${rawSource}\n${rawHost(kind, Object.values(controls)[0] ?? 0, seed ?? 42)}`,
                    )
                  }
                >
                  Copy raw {kind} example
                </Button>
                <pre>
                  <code>
                    {rawSource}
                    {"\n"}
                    {rawHost(kind, Object.values(controls)[0] ?? 0, seed ?? 42)}
                  </code>
                </pre>
              </>
            ) : (
              <p>
                Restore the bundled recipe to view its raw comparison. Edited
                recipes are represented by the current AudioBits code.
              </p>
            )}
          </Tabs.Panel>
        )}
      </Tabs.Root>
      <p aria-live="polite">{copyState}</p>
    </div>
  );
});

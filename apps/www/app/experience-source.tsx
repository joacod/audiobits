"use client";

import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";

export type ExperienceSourceFile = {
  name: string;
  purpose: string;
  code: string;
};

const setup = `npm install audiobits
npm install --save-dev vite typescript
npx vite`;

export function ExperienceSource({
  symbol,
  parameter,
  soundNote,
  interactionNote,
  presentation,
  sources,
}: {
  symbol: string;
  parameter: string;
  soundNote: string;
  interactionNote: string;
  presentation: string;
  sources: readonly ExperienceSourceFile[];
}) {
  const recipe =
    sources.find((file) => file.name === "recipe.ts") ?? sources[0];
  const [copyState, setCopyState] = useState("");
  const [openFile, setOpenFile] = useState(recipe?.name ?? "");
  const visible = sources.find((file) => file.name === openFile) ?? recipe;

  async function copy(name: string, code: string) {
    setOpenFile(name);
    try {
      await navigator.clipboard.writeText(code);
      setCopyState(`Copied ${name}`);
    } catch {
      setCopyState("Copy unavailable. Select and copy the source below.");
    }
  }

  return (
    <div className="catalog-source-tools">
      <p className="catalog-source-note">
        Default implementation. Using the demo does not change these files.
      </p>
      <Tabs.Root defaultValue="sound">
        <Tabs.List aria-label="Source inspector" className="inspector-tabs">
          <Tabs.Tab value="sound">Sound only</Tabs.Tab>
          <Tabs.Tab value="interaction">Complete interaction</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="sound">
          <h3>Copy the sound.</h3>
          <p>{soundNote}</p>
          <p>
            <code>audio.sound({symbol})</code> then{" "}
            <code>{`voice.set({ ${parameter} })`}</code> and{" "}
            <code>voice.stop()</code>.
          </p>
          {recipe && (
            <>
              <p>{recipe.purpose}</p>
              <button
                type="button"
                onClick={() => void copy(recipe.name, recipe.code)}
              >
                Copy {recipe.name}
              </button>
              <pre>
                <code>{recipe.code}</code>
              </pre>
            </>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="interaction">
          <h3>Copy the interaction.</h3>
          <p>{interactionNote}</p>
          <p>{presentation}</p>
          <pre>
            <code>{setup}</code>
          </pre>
          <p>
            Keep the displayed relative paths and open the demo in Vite. These
            files are the portable example.
          </p>
          <div className="catalog-source-files">
            {sources.map((file) => (
              <div key={file.name}>
                <p>
                  <code>{file.name}</code>
                </p>
                <p>{file.purpose}</p>
                <button
                  type="button"
                  onClick={() => void copy(file.name, file.code)}
                >
                  Copy {file.name}
                </button>
              </div>
            ))}
          </div>
          {visible && (
            <pre>
              <code>{visible.code}</code>
            </pre>
          )}
        </Tabs.Panel>
      </Tabs.Root>
      {copyState ? <p role="status">{copyState}</p> : null}
    </div>
  );
}

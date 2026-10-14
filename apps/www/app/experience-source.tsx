"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs } from "@base-ui/react/tabs";

export type ExperienceSourceFile = {
  name: string;
  purpose: string;
  code: string;
};

export function ExperienceSource({
  presentation,
  sources,
}: {
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
        Catalog source, ready to make your own.
      </p>
      <Tabs.Root defaultValue="sound">
        <Tabs.List aria-label="Source inspector" className="inspector-tabs">
          <Tabs.Tab value="sound">Sound only</Tabs.Tab>
          <Tabs.Tab value="interaction">Complete interaction</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="sound">
          {recipe && (
            <>
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
          <p>{presentation}</p>
          <p>
            Add to project installs sound recipes, the reusable controller, an
            integration guide, and a license. These complete demonstration files
            remain available to inspect and copy from the repository.
          </p>
          <p>
            Keep these relative paths together. See the{" "}
            <Link href="/docs/catalog#integrate-into-your-application">
              integration guide
            </Link>{" "}
            for setup and lifecycle, or the{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/joacod/audiobits/blob/main/catalog/README.md#optional-standalone-demo"
            >
              standalone demo setup
            </a>
            .
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

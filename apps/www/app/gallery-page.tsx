import Link from "next/link";
import { ConfirmationDemo } from "./confirmation-demo";
import { siteBuild, rawExampleSource } from "../lib/site-build";
import { soundInfo } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

export function GalleryPage({ selected }: { selected?: SoundKind }) {
  return (
    <main className="foundation">
      <nav aria-label="Main navigation">
        <Link href="/">AudioBits</Link>
        <Link href="/sounds">Sounds</Link>
        <Link href="/docs">Development docs</Link>
      </nav>
      <p className="eyebrow">
        {siteBuild.channel} · {siteBuild.version} · {siteBuild.source}
      </p>
      <h1>{selected ? soundInfo[selected].title : "AudioBits"}</h1>
      <p className="intro">Procedural sound for interactive web experiences.</p>
      <p>Small JSON definitions. Fresh voices. No audio downloads.</p>
      {selected && (
        <p>
          <Link href="/sounds">All sounds</Link>
        </p>
      )}
      <ConfirmationDemo
        key={selected ?? "gallery"}
        rawSource={rawExampleSource()}
        selected={selected}
      />
      <footer>
        <p>
          Development APIs, consumed locally through public package exports. No
          npm release is available.
        </p>
        <Link href="/docs">Read the quick start</Link>
      </footer>
    </main>
  );
}

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
        <Link href="/docs">
          {siteBuild.channel === "Stable" ? "Docs" : "Development docs"}
        </Link>
      </nav>
      <header className="gallery-intro">
        <h1>{selected ? soundInfo[selected].title : "AudioBits"}</h1>
        <p className="intro">Sound as code. Make it yours.</p>
        <p>
          Eight browser-native sounds. Change their character, inspect the
          recipe, and bring one into your app.
        </p>
        <p className="gallery-channel">
          {siteBuild.channel} · {siteBuild.version} · {siteBuild.source}
        </p>
      </header>
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
          {siteBuild.channel === "Stable"
            ? `Release-aligned documentation for AudioBits ${siteBuild.version}.`
            : "Development APIs, consumed locally through public package exports. This build does not establish an npm release."}
        </p>
        <Link href="/docs">Read the quick start</Link>
      </footer>
    </main>
  );
}

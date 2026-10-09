import Link from "next/link";
import { SoundGallery } from "./sound-gallery";
import { siteBuild, rawExampleSource } from "../lib/site-build";
import { soundInfo, soundKinds } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

export function GalleryPage({ selected }: { selected?: SoundKind }) {
  return (
    <main className="foundation showcase-collection">
      <nav className="masthead" aria-label="Main navigation">
        <Link href="/" className="wordmark">
          AudioBits
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 1v22M1 12h22M4 4l16 16M4 20 20 4"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </Link>
        <Link href="/sounds">Sounds</Link>
        <Link href="/docs">Docs</Link>
        <a href="https://github.com/joacod/audiobits">GitHub</a>
      </nav>
      <header className="gallery-intro">
        <h1>
          {selected ? soundInfo[selected].title : "The sound collection."}
        </h1>
        <div className="intro-line">
          <p className="intro">
            {selected
              ? soundInfo[selected].description
              : "Eight sounds. Play, compare and find your next interaction."}
          </p>
          <p className="gallery-channel">
            Available on npm · {siteBuild.version}
          </p>
        </div>
        {selected && (
          <nav className="workbench-nav" aria-label="Sound navigation">
            <Link href="/sounds" aria-label="All sounds">
              All sounds
            </Link>
            <Link
              href={`/sounds/${soundKinds[(soundKinds.indexOf(selected) + soundKinds.length - 1) % soundKinds.length]}`}
            >
              Previous sound
            </Link>
            <Link
              href={`/sounds/${soundKinds[(soundKinds.indexOf(selected) + 1) % soundKinds.length]}`}
            >
              Next sound
            </Link>
          </nav>
        )}
      </header>
      <SoundGallery
        key={selected ?? "collection"}
        rawSource={selected ? rawExampleSource() : ""}
        selected={selected}
      />
      <footer className="showcase-footer">
        <h2>Bring sound to your next idea.</h2>
        <pre>
          <code>npm install audiobits</code>
        </pre>
        <div className="footer-links">
          <Link href="/docs">Get started</Link>
          <Link href="/sounds">Explore sounds</Link>
          <a href="https://github.com/joacod/audiobits">GitHub</a>
        </div>
        <p className="footer-fineprint">
          Generated in your browser. Built on Web Audio.
        </p>
      </footer>
    </main>
  );
}

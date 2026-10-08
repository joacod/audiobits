import Link from "next/link";
import { SoundGallery } from "./sound-gallery";
import { siteBuild, rawExampleSource } from "../lib/site-build";
import { soundInfo, soundKinds } from "../lib/gallery";
import type { SoundKind } from "../lib/gallery";

export function GalleryPage({
  selected,
  home = false,
}: {
  selected?: SoundKind;
  home?: boolean;
}) {
  return (
    <main
      className={`foundation ${home ? "showcase-home" : "showcase-collection"}`}
    >
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
          {home ? (
            <>
              Sound as <em>code.</em>
            </>
          ) : selected ? (
            soundInfo[selected].title
          ) : (
            "The sound collection."
          )}
        </h1>
        <div className="intro-line">
          <p className="intro">
            {home
              ? "Browser-native procedural audio. Hear it. Change it. Make it yours."
              : selected
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
        key={selected ?? (home ? "home" : "collection")}
        rawSource={selected ? rawExampleSource() : ""}
        selected={selected}
        home={home}
      />
      {home && (
        <>
          <section className="code-story" aria-labelledby="code-heading">
            <div>
              <h2 id="code-heading">
                A little code.
                <br />
                <em>A lot of character.</em>
              </h2>
              <p>
                Express the hit, not the node graph. AudioBits owns the voices,
                envelopes and cleanup underneath.
              </p>
              <Link href="/sounds/impact">Compare with raw Web Audio</Link>
            </div>
            <pre>
              <code>{`import { createAudio } from "audiobits";
import { impact } from "audiobits/recipes";

const audio = createAudio();
const hit = audio.sound(impact);

// In a click or tap handler:
await audio.start();
hit.play({ parameters: { intensity: 0.8 } });`}</code>
            </pre>
          </section>
          <section className="recipe-story" aria-labelledby="recipe-heading">
            <h2 id="recipe-heading">The recipe is the sound.</h2>
            <div
              className="recipe-flow"
              aria-label="Recipe data is interpreted by AudioBits to generate browser audio"
            >
              <span>Portable JSON</span>
              <span aria-hidden="true">→</span>
              <span>AudioBits</span>
              <span aria-hidden="true">→</span>
              <span>Web Audio</span>
            </div>
            <div className="recipe-story-copy">
              <p>
                Layers, envelopes, filters and variation. Structured data you
                can read, validate and change. Open any sound’s recipe to try
                it.
              </p>
              <pre>
                <code>{`{
  "schemaVersion": 1,
  "kind": "one-shot",
  "duration": 0.3
}`}</code>
              </pre>
              <Link href="/docs/recipes">Inside a recipe</Link>
            </div>
          </section>
          <section
            className="capability-story"
            aria-labelledby="capability-heading"
          >
            <h2 id="capability-heading">Made for interaction.</h2>
            <dl>
              <div>
                <dt>Voices, with an ending.</dt>
                <dd>
                  Overlap one-shots. Stop sustained sound. Dispose when your app
                  leaves.
                </dd>
              </div>
              <div>
                <dt>Controls with meaning.</dt>
                <dd>
                  Set intensity before Play; move throttle while a thruster
                  runs.
                </dd>
              </div>
              <div>
                <dt>Variation you can keep.</dt>
                <dd>Find a character. Keep its seed. Generate it again.</dd>
              </div>
            </dl>
            <Link href="/docs/lifecycle">Playback and lifecycle</Link>
          </section>
          <section
            className="collection-teaser"
            aria-labelledby="teaser-heading"
          >
            <h2 id="teaser-heading">
              Eight starting points.
              <br />
              <em>Endless character.</em>
            </h2>
            <div className="teaser-list">
              {soundKinds.map((kind) => (
                <Link key={kind} href={`/sounds/${kind}`}>
                  <span>{soundInfo[kind].title}</span>
                  <small>{soundInfo[kind].use}</small>
                </Link>
              ))}
            </div>
            <Link href="/sounds">Explore all sounds →</Link>
          </section>
          <section className="agent-story" aria-labelledby="agent-heading">
            <h2 id="agent-heading">
              Readable by humans.
              <br />
              Composable by agents.
            </h2>
            <p>
              Versioned recipe schema, machine-readable capabilities and an
              included integration Skill. Work from the installed version, with
              runtime validation at the boundary.
            </p>
            <Link href="/docs/api">Explore the public API</Link>
          </section>
        </>
      )}
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

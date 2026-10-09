import Link from "next/link";
import { SoundGallery } from "./sound-gallery";
import { soundInfo, type SoundKind } from "../lib/gallery";
import { siteBuild } from "../lib/site-build";
import "./landing.css";

const preview: SoundKind[] = [
  "glass-notification",
  "impact",
  "whoosh",
  "thruster",
];

export default function Home() {
  return (
    <main className="foundation landing">
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
      <header className="landing-intro">
        <h1>
          Make interfaces <em>sound alive.</em>
        </h1>
        <div className="landing-intro-copy">
          <p>
            Procedural sound effects for the web. Play, customize, and ship
            sounds as code. No required audio assets.
          </p>
          <div className="landing-links">
            <Link href="/sounds">
              Explore the sounds <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/docs">
              Start building <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <code className="landing-install">npm install audiobits</code>
        </div>
      </header>
      <SoundGallery rawSource="" landing />
      <section
        className="landing-collection"
        aria-labelledby="collection-heading"
      >
        <div className="landing-section-heading">
          <h2 id="collection-heading">A sound for the moment.</h2>
          <Link href="/sounds">
            Explore the full collection <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="landing-sound-list">
          {preview.map((kind) => (
            <Link
              key={kind}
              href={`/sounds/${kind}`}
              className="landing-sound-entry"
            >
              <svg
                viewBox="0 0 180 90"
                aria-hidden="true"
                className={`preview-${soundInfo[kind].visualFamily}`}
              >
                {soundInfo[kind].visualFamily === "pulse"
                  ? [12, 22, 32, 42].map((radius) => (
                      <ellipse
                        key={radius}
                        cx="90"
                        cy="45"
                        rx={radius * 1.65}
                        ry={radius}
                      />
                    ))
                  : [0, 1, 2, 3, 4, 5].map((line) => (
                      <path
                        key={line}
                        d={`M0 ${30 + line * 6} C45 ${-10 + line * 9}, 100 ${95 - line * 5}, 180 ${30 + line * 6}`}
                      />
                    ))}
              </svg>
              <h3>{soundInfo[kind].title}</h3>
              <p>{soundInfo[kind].use}</p>
              <span className="landing-open">
                Open workbench <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="landing-why" aria-labelledby="why-heading">
        <h2 id="why-heading">
          Less asset wrangling.
          <br />
          <em>More character.</em>
        </h2>
        <dl>
          <div>
            <dt>Procedural by design</dt>
            <dd>
              Web Audio generates the sound in your browser. No prerecorded
              audio files required.
            </dd>
          </div>
          <div>
            <dt>Recipes you can understand</dt>
            <dd>
              Portable, editable, versioned JSON. Semantic parameters and seeded
              variation make the character yours.
            </dd>
          </div>
          <div>
            <dt>Built for interaction</dt>
            <dd>
              A typed library manages voices and cleanup. Shape the next hit, or
              adjust a live voice where supported.
            </dd>
          </div>
        </dl>
      </section>
      <footer className="landing-footer">
        <h2>
          Your next interaction
          <br />
          could <em>sound like this.</em>
        </h2>
        <div>
          <pre>
            <code>npm install audiobits</code>
          </pre>
          <div className="landing-links">
            <Link href="/docs">
              Getting started <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/sounds">All sounds</Link>
            <a href="https://github.com/joacod/audiobits">GitHub</a>
          </div>
          <p className="landing-fineprint">
            Available on npm · {siteBuild.version}
          </p>
        </div>
      </footer>
    </main>
  );
}

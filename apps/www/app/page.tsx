import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "./arrow-icon";
import { ChargeHero } from "./charge-hero";
import { SiteHeader } from "./site-header";
import {
  energyChargeExperience,
  reactiveThrusterExperience,
} from "../lib/experiences";
import { soundInfo, type SoundKind } from "../lib/gallery";
import { siteBuild } from "../lib/site-build";
import "./landing.css";
import "./charge-hero.css";

export const metadata: Metadata = {
  title: { absolute: "AudioBits | Procedural Sound Effects for the Web" },
  alternates: { canonical: "/" },
};

const preview: SoundKind[] = ["impact", "glass-notification", "whoosh"];

const experiences = [
  { ...energyChargeExperience, mark: "charge" },
  { ...reactiveThrusterExperience, mark: "thruster" },
] as const;

export default function Home() {
  return (
    <main className="foundation landing">
      <SiteHeader current="home" />
      <ChargeHero />
      <section className="landing-use" aria-labelledby="use-heading">
        <h2 id="use-heading">How you use this</h2>
        <div className="use-grid">
          <article>
            <h3>The package</h3>
            <p>
              AudioBits is the runtime you install. Create an engine, then play
              from a click, tap, or key press.
            </p>
          </article>
          <article>
            <h3>Bundled recipes</h3>
            <p>
              Eight sounds ship in the package. Open one, change its parameters,
              and copy the example into your app.
            </p>
          </article>
          <article>
            <h3>Independent examples</h3>
            <p>
              Energy Charge and Reactive Thruster are complete pages you can
              copy. They are not bundled recipes. Each one wires a small
              interaction to the same engine.
            </p>
          </article>
        </div>
      </section>
      <section className="landing-catalog" aria-labelledby="catalog-heading">
        <div className="landing-section-heading">
          <h2 id="catalog-heading">Examples and bundled sounds</h2>
          <Link href="/sounds">
            See all eight sounds <ArrowIcon />
          </Link>
        </div>
        <p className="catalog-note">
          Examples are complete hosts. The three sounds are bundled recipes.
          Open a page to hear it.
        </p>
        <div className="landing-experiences">
          {experiences.map((experience) => (
            <Link
              key={experience.href}
              href={experience.href}
              className="landing-experience"
            >
              <ExperienceMark kind={experience.mark} />
              <span>
                <h3>{experience.title}</h3>
                <p>{experience.description}</p>
              </span>
              <span className="landing-open">
                Open example <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>
        <div className="landing-sound-list">
          {preview.map((kind) => (
            <Link
              key={kind}
              href={`/sounds/${kind}`}
              className="landing-sound-entry"
            >
              <Portrait family={soundInfo[kind].visualFamily} />
              <h3>{soundInfo[kind].title}</h3>
              <p>{soundInfo[kind].use}</p>
              <span className="landing-open">
                Open workbench <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <footer className="landing-footer">
        <div>
          <p className="landing-fineprint">
            Available on npm · {siteBuild.version}
          </p>
          <pre>
            <code>npm install audiobits</code>
          </pre>
        </div>
        <div className="landing-links">
          <Link href="/docs">
            Documentation <ArrowIcon />
          </Link>
          <a href="https://github.com/joacod/audiobits">GitHub</a>
        </div>
      </footer>
    </main>
  );
}

function Portrait({
  family,
}: {
  family: (typeof soundInfo)[SoundKind]["visualFamily"];
}) {
  return (
    <svg
      viewBox="0 0 180 90"
      aria-hidden="true"
      className={`preview-${family}`}
    >
      {family === "pulse"
        ? [12, 22, 32, 42].map((radius) => (
            <ellipse
              key={radius}
              cx="90"
              cy="45"
              rx={radius * 1.65}
              ry={radius}
            />
          ))
        : family === "harmonic"
          ? [24, 38, 52, 66].map((y) => (
              <path
                key={y}
                d={`M12 ${y} Q32 ${y - 8}, 52 ${y} T92 ${y} T132 ${y} T168 ${y}`}
              />
            ))
          : [0, 1, 2, 3, 4, 5].map((line) => (
              <path
                key={line}
                d={`M0 ${30 + line * 6} C45 ${-10 + line * 9}, 100 ${95 - line * 5}, 180 ${30 + line * 6}`}
              />
            ))}
    </svg>
  );
}

function ExperienceMark({ kind }: { kind: "charge" | "thruster" }) {
  if (kind === "charge") {
    return (
      <svg className="experience-mark" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="5" fill="currentColor" />
        <circle
          cx="32"
          cy="32"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }
  return (
    <svg className="experience-mark" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M6 24c12-8 28-8 52 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 32c14-6 30 8 52 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 40c12 8 32 8 52-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

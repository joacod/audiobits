import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "../icons/arrow-icon";
import { ExperienceMark } from "../icons/experience-mark";
import { SoundPortrait } from "../icons/sound-portrait";
import { ThrusterHero } from "./thruster-hero";
import { SiteHeader } from "./site-header";
import { catalogEntries, catalogEntriesByCategory } from "../lib/catalog";
import { siteBuild } from "../lib/site-build";
import "./landing.css";
import "./thruster-hero.css";

export const metadata: Metadata = {
  title: { absolute: "AudioBits | Procedural Sound Effects" },
  alternates: { canonical: "/" },
};

const previewSlugs = ["impact", "glass-notification", "whoosh"] as const;
const previews = previewSlugs.map((slug) => {
  const entry = catalogEntries.find((item) => item.slug === slug);
  if (!entry || entry.category !== "bundled") {
    throw new Error(`Missing bundled catalog entry: ${slug}`);
  }
  return entry;
});
const experiences = catalogEntriesByCategory("experience");

export default function Home() {
  return (
    <main className="foundation landing">
      <SiteHeader current="home" />
      <ThrusterHero />
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
            <h3>Recipes you own</h3>
            <p>
              Eight sounds live in the catalog. Open one, change its parameters,
              and copy the example into your app.
            </p>
          </article>
          <article>
            <h3>Independent examples</h3>
            <p>
              Energy Charge and Reactive Thruster are complete pages you can
              copy. Each includes sound source and wires a small interaction to
              the same engine.
            </p>
          </article>
        </div>
      </section>
      <section className="landing-catalog" aria-labelledby="catalog-heading">
        <div className="landing-section-heading">
          <h2 id="catalog-heading">Examples and catalog sounds</h2>
          <Link href="/catalog">
            Open the catalog <ArrowIcon />
          </Link>
        </div>
        <p className="catalog-note">
          Examples are complete hosts. The three sounds are copy-owned recipes.
          Open a page to hear it.
        </p>
        <div className="landing-experiences">
          {experiences.map((experience) => (
            <Link
              key={experience.href}
              href={experience.href}
              className="landing-experience"
            >
              <ExperienceMark kind={experience.preview.family} />
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
          {previews.map((entry) => (
            <Link
              key={entry.slug}
              href={entry.href}
              className="landing-sound-entry"
            >
              <SoundPortrait family={entry.preview.family} />
              <h3>{entry.title}</h3>
              <p>{entry.use}</p>
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

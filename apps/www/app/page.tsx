import type { Metadata } from "next";
import Link from "next/link";
import { ExperienceLink } from "./experience-link";
import { ArrowIcon } from "../icons/arrow-icon";
import { ExperienceMark } from "../icons/experience-mark";
import { SoundPortrait } from "../icons/sound-portrait";
import { SignalArtwork } from "./signal-artwork";
import { LightsaberHero } from "./lightsaber-hero";
import { SiteHeader } from "./site-header";
import { LandingCommand } from "./landing-command";
import { catalogEntries, catalogEntriesByCategory } from "../lib/catalog";
import { registryItem } from "../lib/registry";
import { siteBuild } from "../lib/site-build";
import { siteUrl } from "../lib/site-url";
import audiobitsPackage from "../../../packages/audiobits/package.json";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "AudioBits | Procedural Sound Effects" },
  alternates: { canonical: "/" },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "AudioBits",
    description: audiobitsPackage.description,
    url: siteUrl,
    codeRepository: "https://github.com/joacod/audiobits",
    programmingLanguage: "TypeScript",
    license: "https://opensource.org/licenses/MIT",
    version: audiobitsPackage.version,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AudioBits",
    url: siteUrl,
  },
];

const previewSlugs = ["impact", "glass-notification", "whoosh"] as const;
const previews = previewSlugs.map((slug) => {
  const entry = catalogEntries.find((item) => item.slug === slug);
  if (!entry || entry.category !== "bundled") {
    throw new Error(`Missing bundled catalog entry: ${slug}`);
  }
  return entry;
});
const experiences = catalogEntriesByCategory("experience").filter(
  (entry) => entry.slug !== "lightsaber",
);
const lightsaberInstall = `npx shadcn@latest add joacod/audiobits/${registryItem("lightsaber").name}`;

export default function Home() {
  return (
    <main className="foundation landing">
      {jsonLd.map((item) => (
        <script
          key={item["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
      <SiteHeader current="home" />
      <LightsaberHero />
      <section className="landing-catalog" aria-labelledby="catalog-heading">
        <div className="landing-section-heading">
          <h2 id="catalog-heading">Find your frequency.</h2>
          <Link href="/catalog">
            Explore the full catalog <ArrowIcon />
          </Link>
        </div>
        <div className="landing-experiences">
          {experiences.map((experience) => (
            <ExperienceLink
              key={experience.href}
              href={experience.href}
              className="landing-experience"
              data-family={experience.preview.family}
            >
              <div className="landing-experience-art">
                <SignalArtwork family={experience.preview.family} />
                <ExperienceMark kind={experience.preview.family} />
              </div>
              <span>
                <h3>{experience.title}</h3>
                <p>{experience.description}</p>
              </span>
              <span className="landing-open">
                Open example <ArrowIcon />
              </span>
            </ExperienceLink>
          ))}
        </div>
        <div className="landing-sound-list">
          {previews.map((entry) => (
            <Link
              key={entry.slug}
              href={entry.href}
              className="landing-sound-entry"
              data-family={entry.preview.family}
            >
              <div className="landing-sound-art">
                <SignalArtwork family={entry.preview.family} />
                <SoundPortrait family={entry.preview.family} />
              </div>
              <h3>{entry.title}</h3>
              <p>{entry.use}</p>
              <span className="landing-open">
                Open workbench <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section
        className="landing-own landing-adopt"
        aria-labelledby="own-heading"
      >
        <div>
          <h2 id="own-heading">Hear it. Own it.</h2>
          <p>Add editable sounds to your project. Powered by AudioBits.</p>
        </div>
        <div className="landing-action">
          <LandingCommand
            command={lightsaberInstall}
            label="lightsaber install"
          />
          <p className="landing-context">
            Run in your project. The registry adds editable Lightsaber source
            and the required{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.npmjs.com/package/audiobits"
            >
              audiobits npm runtime
            </a>
            .
          </p>
          <div className="landing-links">
            <Link href="/docs/catalog">
              Install editable source <ArrowIcon />
            </Link>
            <Link href="/docs">
              Build with the runtime <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
      <section
        className="landing-agents landing-adopt"
        aria-labelledby="agents-heading"
      >
        <div>
          <h2 id="agents-heading">Let your AI agent build the sound.</h2>
          <p>
            The official AudioBits Skill guides your coding agent to create
            sounds and wire them into your app.
          </p>
          <div className="landing-links">
            <Link href="/docs/agents">
              Build with AI agents <ArrowIcon />
            </Link>
          </div>
        </div>
        <div className="landing-action">
          <LandingCommand
            command="npx skills add joacod/audiobits --skill audiobits"
            label="Skill install"
          />
          <blockquote className="landing-agent-request">
            Use the AudioBits Skill to add a soft confirmation sound to my Save
            button. Start from the click and clean up when the view closes.
          </blockquote>
          <p className="landing-context">
            For complex workflows, explore{" "}
            <Link href="/docs/mcp">optional local MCP tooling</Link>.
          </p>
        </div>
      </section>
      <footer className="landing-footer">
        <div>
          <p className="footer-statement">Make some noise.</p>
          <p className="landing-fineprint">
            Available on npm · {siteBuild.version}
          </p>
        </div>
        <div className="landing-links">
          <Link href="/docs">
            Docs <ArrowIcon />
          </Link>
          <Link href="/catalog">Catalog</Link>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.npmjs.com/package/audiobits"
          >
            npm
          </a>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/joacod/audiobits"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

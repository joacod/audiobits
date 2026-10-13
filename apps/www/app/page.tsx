import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "../icons/arrow-icon";
import { ExperienceMark } from "../icons/experience-mark";
import { SoundPortrait } from "../icons/sound-portrait";
import { ThrusterHero } from "./thruster-hero";
import { SiteHeader } from "./site-header";
import { LandingCommand } from "./landing-command";
import { catalogEntries, catalogEntriesByCategory } from "../lib/catalog";
import { registryItem } from "../lib/registry";
import { siteBuild } from "../lib/site-build";
import { siteUrl } from "../lib/site-url";
import audiobitsPackage from "../../../packages/audiobits/package.json";
import "./landing.css";
import "./thruster-hero.css";

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
  (entry) => entry.slug !== "reactive-thruster",
);
const thrusterInstall = `npx shadcn@latest add joacod/audiobits/${registryItem("reactive-thruster").name}`;

export default function Home() {
  return (
    <main className="foundation landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader current="home" />
      <ThrusterHero />
      <section
        className="landing-own landing-adopt"
        aria-labelledby="own-heading"
      >
        <div>
          <h2 id="own-heading">Hear it. Own it.</h2>
          <p>Add editable sounds to your project. Powered by AudioBits.</p>
        </div>
        <div className="landing-action">
          <LandingCommand command={thrusterInstall} label="thruster install" />
          <p className="landing-context">
            Run in your project. The registry adds editable Thruster source and
            the required{" "}
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
      <section className="landing-catalog" aria-labelledby="catalog-heading">
        <div className="landing-section-heading">
          <h2 id="catalog-heading">Explore more</h2>
          <Link href="/catalog">
            Explore the full catalog <ArrowIcon />
          </Link>
        </div>
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

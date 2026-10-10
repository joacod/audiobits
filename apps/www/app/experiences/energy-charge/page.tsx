import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { energyChargeExperience as experience } from "../../../lib/experiences";
import { EnergyShowcase } from "./showcase";
import "./showcase.css";

export const metadata = {
  title: "Energy charge | AudioBits",
  description: experience.description,
};

export default function Page() {
  const sources = experience.sourceFiles.map((name) => ({
    name,
    code: readFileSync(
      join(process.cwd(), "../../catalog/energy-charge", name),
      "utf8",
    ),
  }));
  return (
    <main className="foundation energy-showcase">
      <nav className="masthead" aria-label="Main navigation">
        <Link className="wordmark" href="/">
          AudioBits
        </Link>
        <Link href="/sounds">Sounds</Link>
        <Link href="/docs">Docs</Link>
        <a href="https://github.com/joacod/audiobits">GitHub</a>
      </nav>
      <header className="energy-intro">
        <h1>
          Build energy
          <br />
          <em>Feel the charge.</em>
        </h1>
        <div>
          <p>
            A low hum, a beating harmonic field, a rising shimmer. One evolving
            sound driven by your progress.
          </p>
          <p>Hold to charge. Release to discharge. Or set progress directly.</p>
        </div>
      </header>
      <EnergyShowcase sources={sources} />
      <section className="energy-related">
        <h2>A small runtime. Two kinds of play.</h2>
        <p>
          Shape a continuous voice, or play a single hit. Both use the same
          AudioBits engine.
        </p>
        <Link href="/sounds/impact">Customize the bundled impact</Link>
        {" · "}
        <Link href="/sounds">Explore all standalone sounds</Link>
      </section>
    </main>
  );
}

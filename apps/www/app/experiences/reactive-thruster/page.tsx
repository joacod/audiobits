import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SiteHeader } from "../../site-header";
import { reactiveThrusterExperience as experience } from "../../../lib/experiences";
import { ThrusterShowcase } from "./showcase";
import "./showcase.css";

export const metadata = {
  title: "Reactive thruster | AudioBits",
  description: experience.description,
};

export default function Page() {
  const sources = experience.sourceFiles.map((name) => ({
    name,
    code: readFileSync(
      join(process.cwd(), "../../catalog/reactive-thruster", name),
      "utf8",
    ),
  }));
  return (
    <main className="foundation thruster-showcase">
      <SiteHeader />
      <header className="thruster-intro">
        <h1>
          Give movement
          <br />
          <em>a voice.</em>
        </h1>
        <div>
          <p>
            A motor, a turbine, a trail of exhaust. One living sound that
            follows your hand.
          </p>
          <p>Drag to ignite. Move faster to push harder. Release to coast.</p>
        </div>
      </header>
      <ThrusterShowcase sources={sources} />
      <section className="thruster-related">
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

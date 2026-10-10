import Link from "next/link";
import { reactiveThrusterExperience as experience } from "../lib/experiences";
import "./experiences/reactive-thruster/showcase.css";

export function ExperienceDiscovery() {
  return (
    <section
      className="experience-discovery"
      aria-label="Interactive experiences"
    >
      <div>
        <h2>Sound that follows your hand.</h2>
        <p>
          From a single confirmation to a continuously controlled thruster. One
          small runtime, ready for both.
        </p>
      </div>
      <Link href={experience.href}>Try the reactive thruster</Link>
    </section>
  );
}

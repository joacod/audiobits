import { LightsaberDetail } from "./lightsaber-detail";
import { ExperienceLink } from "./experience-link";
import { ArrowIcon } from "../icons/arrow-icon";
import "./lightsaber-hero.css";

export function LightsaberHero() {
  return (
    <section className="lightsaber-hero" aria-label="Lightsaber hero">
      <div className="lightsaber-intro">
        <h1>Sound that reacts.</h1>
        <p>
          Procedural sound effects for the web. Hold to ignite. Move to swing.
        </p>
      </div>
      <LightsaberDetail />
      <div className="landing-links lightsaber-links">
        <ExperienceLink href="/catalog/lightsaber">
          Open lightsaber source <ArrowIcon />
        </ExperienceLink>
        <ExperienceLink href="/catalog">
          Explore the catalog <ArrowIcon />
        </ExperienceLink>
      </div>
    </section>
  );
}

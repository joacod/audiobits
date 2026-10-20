import { LightsaberDetail } from "./lightsaber-detail";
import { ExperienceLink } from "./experience-link";
import { ArrowIcon } from "../icons/arrow-icon";
import "./lightsaber-hero.css";

export function LightsaberHero() {
  return (
    <section className="lightsaber-hero" aria-label="Lightsaber hero">
      <div className="lightsaber-intro">
        <h1 aria-label="Sound that reacts.">
          <span aria-hidden="true">
            {Array.from("Sound that ").map((letter, index) => (
              <span className="hero-letter" data-letter={letter} key={index}>
                {letter}
              </span>
            ))}
          </span>
          <span aria-hidden="true">
            {Array.from("reacts.").map((letter, index) => (
              <span
                className={`hero-letter${letter === "." ? " hero-period" : ""}`}
                data-letter={letter}
                key={index}
              >
                {letter}
              </span>
            ))}
          </span>
        </h1>
      </div>
      <p className="hero-description">
        Procedural sound effects for the web.
        <br />
        Hold. Move. Hear what happens.
      </p>
      <LightsaberDetail requireTouchActivation />
      <div className="hero-signal" aria-hidden="true">
        <span>Input becomes sound</span>
        <svg viewBox="0 0 600 60" preserveAspectRatio="none">
          <path className="hero-wave" d="M0 30H600" />
        </svg>
        <span>Generated in your browser</span>
      </div>
      <div className="hero-footer">
        <p>
          Procedural sound effects for the web.
          <br />
          Made with code. Played by you.
        </p>
        <div className="landing-links lightsaber-links">
          <ExperienceLink href="/catalog/lightsaber">
            Open lightsaber source <ArrowIcon />
          </ExperienceLink>
          <ExperienceLink href="/catalog">
            Explore the catalog <ArrowIcon />
          </ExperienceLink>
        </div>
      </div>
    </section>
  );
}

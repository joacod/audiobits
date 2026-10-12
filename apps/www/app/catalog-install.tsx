import Link from "next/link";
import { registryInstallCommand, registryItem } from "../lib/registry";
import { LandingCommand } from "./landing-command";

export function CatalogInstall({ slug }: { slug: string }) {
  const item = registryItem(slug);
  return (
    <section className="catalog-adoption" aria-labelledby="catalog-add-heading">
      <h2 id="catalog-add-heading">Add to project</h2>
      <LandingCommand
        command={registryInstallCommand(slug)}
        label={item.title}
      />
      <p>
        Adds editable source and the <code>audiobits</code> runtime dependency.{" "}
        <Link href="/docs/catalog#install-source">Installation guide</Link>
      </p>
      <p className="catalog-install-note">
        {item.meta.classification === "recipe"
          ? "Installs the catalog defaults. Copy your current settings or edits from the source below."
          : "Installs the catalog defaults, controller, and browser example. Inspect individual files below."}
      </p>
    </section>
  );
}

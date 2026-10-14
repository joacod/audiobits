import Link from "next/link";
import type { ReactNode } from "react";
import { registryInstallCommand, registryItem } from "../lib/registry";
import { LandingCommand } from "./landing-command";

export function CatalogInstall({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
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
          ? "Installs the catalog defaults. The usage below reflects your current settings and applied edits."
          : "Installs the catalog defaults and sound controller. The website visuals and input system stay in the showcase."}
      </p>
      {children}
    </section>
  );
}

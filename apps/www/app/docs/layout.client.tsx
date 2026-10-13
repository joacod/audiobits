"use client";

import { useId } from "react";
import Link from "next/link";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { GithubIcon } from "../../icons/github-icon";
import { NpmIcon } from "../../icons/npm-icon";
import { BrandMark } from "../../icons/brand-mark";
import { HomeIcon } from "../../icons/home-icon";
import { CatalogIcon } from "../../icons/catalog-icon";

export function DocsBrand() {
  // The native desktop and mobile titles coexist, even when one is hidden.
  const gradientId = useId();
  return (
    <>
      <BrandMark
        size={28}
        gradientId={gradientId}
        className="audiobits-docs-mark"
      />
      AudioBits
    </>
  );
}

export function DocsUtilities() {
  return (
    <div
      role="group"
      aria-label="Documentation utilities"
      className="flex items-center gap-1 text-fd-muted-foreground"
    >
      <a
        href="https://github.com/joacod/audiobits"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="AudioBits on GitHub"
        title="AudioBits on GitHub"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <GithubIcon />
      </a>
      <a
        href="https://www.npmjs.com/package/audiobits"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="AudioBits on npm"
        title="AudioBits on npm"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <NpmIcon />
      </a>
      <ThemeSwitch />
    </div>
  );
}

export function DocsSidebarFooter() {
  return (
    <nav
      aria-label="AudioBits site"
      className="grid grid-cols-2 gap-1 rounded-lg border bg-fd-secondary/50 p-1"
    >
      <Link
        href="/"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "gap-2",
        })}
      >
        <HomeIcon className="shrink-0 text-fd-muted-foreground" />
        Home
      </Link>
      <Link
        href="/catalog"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "gap-2",
        })}
      >
        <CatalogIcon className="shrink-0 text-fd-muted-foreground" />
        Catalog
      </Link>
    </nav>
  );
}

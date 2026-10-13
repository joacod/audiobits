"use client";

import { useId } from "react";
import { Header } from "fumadocs-ui/layouts/docs/slots/header";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { GithubIcon } from "../../icons/github-icon";
import { NpmIcon } from "../../icons/npm-icon";
import { BrandMark } from "../../icons/brand-mark";

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
      className="flex items-center justify-end gap-1 text-fd-muted-foreground"
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

export function DocsHeader() {
  return (
    <>
      <Header />
      <header className="[grid-area:header] sticky top-(--fd-docs-row-1) z-30 flex items-center justify-end border-b bg-fd-background/80 px-4 backdrop-blur-sm h-(--fd-header-height) max-md:hidden md:layout:[--fd-header-height:--spacing(14)]">
        <DocsUtilities />
      </header>
    </>
  );
}

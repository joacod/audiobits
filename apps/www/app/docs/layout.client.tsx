"use client";

import { useId } from "react";
import Link from "next/link";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { Header } from "fumadocs-ui/layouts/docs/slots/header";
import { useSidebar } from "fumadocs-ui/layouts/docs/slots/sidebar";
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

export function DocsHeader() {
  const { slots } = useDocsLayout();
  const { collapsed, setCollapsed } = useSidebar();
  return (
    <>
      <Header />
      {collapsed && (
        <header className="audiobits-docs-collapsed-header [grid-area:header] sticky top-(--fd-docs-row-1) z-30 border-b bg-fd-background/80 backdrop-blur-sm h-(--fd-header-height) max-md:hidden md:layout:[--fd-header-height:--spacing(14)]">
          <div className="mx-auto flex h-full max-w-[900px] items-center gap-2 px-6 xl:px-8">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Expand Sidebar
            </button>
            {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled />}
            <Link href="/docs" className="ms-auto text-sm font-medium">
              AudioBits Docs
            </Link>
            <div className="xl:hidden">
              <DocsUtilities />
            </div>
          </div>
        </header>
      )}
    </>
  );
}

export function DocsSidebarFooter() {
  return (
    <nav
      aria-label="AudioBits site"
      className="flex items-center gap-1 rounded-lg border bg-fd-secondary/50 p-1"
    >
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Home
      </Link>
      <Link
        href="/catalog"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Catalog
      </Link>
    </nav>
  );
}

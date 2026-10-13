import type { ReactNode } from "react";
import { asMarkdown, md } from "fumadocs-core/server";
import { siteBuild } from "./site-build";
import { siteUrl } from "./site-url";

function Container({ children }: { children?: ReactNode }) {
  asMarkdown();
  return children;
}

export const markdownComponents = {
  PackageChannel() {
    asMarkdown();
    return `AudioBits API · ${siteBuild.version} · Available on npm.\n\n`;
  },
  Cards: Container,
  Tabs: Container,
  Steps: Container,
  Step: Container,
  Files: Container,
  Card({
    title,
    href,
    children,
  }: {
    title: string;
    href: string;
    children?: ReactNode;
  }) {
    asMarkdown();
    return md`**[${title}](${new URL(href, siteUrl).href})**\n\n${children}\n\n`;
  },
  Tab({ value, children }: { value: string; children?: ReactNode }) {
    asMarkdown();
    return md`**${value}**\n\n${children}\n\n`;
  },
  Callout({ title, children }: { title?: string; children?: ReactNode }) {
    asMarkdown();
    return md.linePrefix("> ")`${title ? `**${title}**\n\n` : ""}${children}`;
  },
  async Folder({ name, children }: { name: string; children?: ReactNode }) {
    asMarkdown();
    const nested = await md.indent(2)`${children}`;
    return `- ${name}/\n${nested}`;
  },
  File({ name }: { name: string }) {
    asMarkdown();
    return `- ${name}\n`;
  },
};

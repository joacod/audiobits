import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "../../lib/source";
import { siteBuild } from "../../lib/site-build";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{ title: `AudioBits · ${siteBuild.channel}` }}
    >
      {children}
    </DocsLayout>
  );
}

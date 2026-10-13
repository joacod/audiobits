import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "../../lib/source";
import { DocsBrand, DocsSidebarFooter, DocsUtilities } from "./layout.client";
import "./docs.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      containerProps={{ className: "audiobits-docs" }}
      nav={{
        title: <DocsBrand />,
        url: "/docs",
      }}
      themeSwitch={{ enabled: false }}
      sidebar={{
        footer: <DocsSidebarFooter key="site-navigation" />,
        banner: (
          <div key="docs-utilities" className="xl:hidden">
            <DocsUtilities />
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}

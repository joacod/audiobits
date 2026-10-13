import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { source } from "../../lib/source";
import {
  DocsBrand,
  DocsHeader,
  DocsSidebarFooter,
  DocsUtilities,
} from "./layout.client";
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
      slots={{ header: DocsHeader }}
      themeSwitch={{ enabled: false }}
      sidebar={{
        footer: <DocsSidebarFooter />,
        banner: (
          <div className="xl:hidden">
            <DocsUtilities />
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}

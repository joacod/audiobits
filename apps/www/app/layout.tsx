import { siteBuild } from "../lib/site-build";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

export const metadata: Metadata = {
  title: `AudioBits — ${siteBuild.channel}`,
  description: `Procedural browser audio. Eight-sound gallery and ${siteBuild.channel.toLowerCase()} documentation.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

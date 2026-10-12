import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { siteUrl } from "../lib/site-url";
import { bigShoulders, geistMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AudioBits | Procedural Sound Effects for the Web",
    template: "%s | AudioBits",
  },
  description:
    "Hear, customize, and integrate procedural sound effects generated in your browser with Web Audio.",
  manifest: "/site.webmanifest",
  // Explicit list: setting `icons` replaces the app/ file-convention links.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.png",
    other: [
      { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#050507" },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#050507",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bigShoulders.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <RootProvider theme={{ defaultTheme: "dark" }}>{children}</RootProvider>
      </body>
    </html>
  );
}

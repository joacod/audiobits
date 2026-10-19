import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RootProvider } from "fumadocs-ui/provider/next";
import { brandColors } from "../lib/brand-colors";
import { siteUrl } from "../lib/site-url";
import { bigShoulders, geistMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AudioBits | Procedural Sound Effects",
    template: "AudioBits | %s",
  },
  description:
    "A tiny Web Audio engine plus a catalog of sounds you copy into your app and own. Play them, tweak them live, or let your coding agent add them.",
  manifest: "/site.webmanifest",
  // Explicit list: setting `icons` replaces the app/ file-convention links.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.png",
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: brandColors.void,
      },
    ],
  },
  openGraph: { siteName: "AudioBits", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: brandColors.void,
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

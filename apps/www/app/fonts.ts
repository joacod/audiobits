import localFont from "next/font/local";

// Self-hosted through next/font/local from the OFL-1.1 Fontsource packages.
// Licenses: licenses/big-shoulders-display.txt and licenses/geist-mono.txt.
export const bigShoulders = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/big-shoulders-display/files/big-shoulders-display-latin-900-normal.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-big-shoulders",
  display: "swap",
});

export const geistMono = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

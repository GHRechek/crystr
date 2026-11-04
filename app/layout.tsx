import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The three faces ship with the app (app/fonts, from the Fontsource packages, all under the
// SIL Open Font License) instead of being fetched from Google at build time: a build with no
// route to fonts.googleapis.com used to fail the deploy.
const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const silkscreen = localFont({
  src: [
    { path: "./fonts/silkscreen-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/silkscreen-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-silkscreen",
  display: "swap",
});

// A pixel face with lower-case letters, for the wiki's reading text: Silkscreen is capitals
// only, which is fine for labels and tiring for paragraphs.
const pixelBody = localFont({
  src: [
    { path: "./fonts/pixelify-sans-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/pixelify-sans-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/pixelify-sans-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/pixelify-sans-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-pixel-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRYSTR",
  description:
    "A social network for The City. Your mana is your strength, so look after it.",
};

export const viewport: Viewport = {
  themeColor: "#161826",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${silkscreen.variable} ${pixelBody.variable}`}>
      <body>{children}</body>
    </html>
  );
}

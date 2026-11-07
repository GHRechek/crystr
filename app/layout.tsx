import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// The faces ship with the app (app/fonts, from the Fontsource packages, all under the
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

// The label face (the small capitals on buttons, tabs and headings). It was Silkscreen, whose
// C, O and G are nearly one shape at small sizes; this is Jersey 10, a crisper pixel face where
// they are three, with its lower case folded onto the capitals (as Silkscreen did, so text
// reads exactly as before) and renamed Crystr Label because the file is changed. size-adjust
// scales it to the size Silkscreen sat at, so nothing else on the page moves. A weight range
// is declared so a bold request is not smeared into a fake bold.
const label = localFont({
  src: [{ path: "./fonts/crystr-label.woff2", weight: "400 700" }],
  declarations: [{ prop: "size-adjust", value: "125%" }],
  variable: "--font-label",
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

import { ZoomLock } from "@/components/zoom-lock";

export const metadata: Metadata = {
  title: "CRYSTR",
  description:
    "A social network for The City. Your mana is your strength, so look after it.",
  // From the home screen it runs as an app, full screen, with no Safari bars.
  appleWebApp: { capable: true, title: "CRYSTR", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png", icon: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#161826",
  width: "device-width",
  initialScale: 1,
  // No pinch or double-tap zoom: the app stays the size it is.
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${label.variable} ${pixelBody.variable}`}>
      <body>
        <ZoomLock />
        {children}
      </body>
    </html>
  );
}

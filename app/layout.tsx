import type { Metadata, Viewport } from "next";
import { Inter, Pixelify_Sans, Silkscreen } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
  display: "swap",
});

// A pixel face with lower-case letters, for the wiki's reading text: Silkscreen is capitals
// only, which is fine for labels and tiring for paragraphs.
const pixelBody = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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

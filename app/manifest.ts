import type { MetadataRoute } from "next";

/** Added to the home screen, CRYSTR opens as its own app: no browser bars. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CRYSTR",
    short_name: "CRYSTR",
    description: "A social network for The City.",
    start_url: "/",
    display: "standalone",
    background_color: "#161826",
    theme_color: "#161826",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

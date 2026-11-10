/** @type {import('next').NextConfig} */
const nextConfig = {
  // The portrait cells are read at runtime by the /face route, so they have
  // to be traced into the serverless bundle.
  outputFileTracingIncludes: {
    "/face/[spec]": ["./assets/portrait/**/*.png"],
    // Likewise the token items, read by /token.
    "/token/[spec]": ["./public/badges/items/*.png"],
    // The sprite editor reads the shipped cells and creature pictures, and previews a face with a cell as drawn.
    "/api/sprite": ["./assets/portrait/**/*.png", "./public/creatures/*.png"],
    "/api/sprite/preview": ["./assets/portrait/**/*.png"],
    // The creature editor re-dresses a creature's pictures when its first type changes.
    "/creatures/[slug]": ["./public/creatures/*.png"],
  },

  // Nobody else gets to put this app inside their own page: a framed copy can
  // trick someone into pressing a button (a vouch, a vote) they cannot see.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

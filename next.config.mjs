/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The portrait cells are read at runtime by the /face route, so they have
    // to be traced into the serverless bundle. Next 14 keeps this key under
    // `experimental`; at the top level it is silently ignored, and the cells
    // only ship because nft happens to resolve the static prefix of
    // `join(process.cwd(), "assets", "portrait", …)`. Say it explicitly.
    outputFileTracingIncludes: {
      "/face/[spec]": ["./assets/portrait/**/*.png"],
    },
  },
};

export default nextConfig;

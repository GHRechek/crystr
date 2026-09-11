/** @type {import('next').NextConfig} */
const nextConfig = {
  // The portrait cells are read at runtime by the /face route, so they have
  // to be traced into the serverless bundle.
  outputFileTracingIncludes: {
    "/face/[spec]": ["./assets/portrait/**/*.png"],
  },
};

export default nextConfig;

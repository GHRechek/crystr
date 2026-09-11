/** @type {import('next').NextConfig} */
const nextConfig = {
  // The portrait layers are read at runtime by the /face route, so they have
  // to be traced into the serverless bundle.
  outputFileTracingIncludes: {
    "/face/[spec]": ["./assets/faces/**/*.png"],
  },
};

export default nextConfig;

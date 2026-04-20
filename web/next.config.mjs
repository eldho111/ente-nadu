/** @type {import('next').NextConfig} */
const requestedDistDir = process.env.NEXT_DIST_DIR?.trim();
const safeDistDirPattern = /^[A-Za-z0-9._-]+$/;
const resolvedDistDir =
  requestedDistDir && safeDistDirPattern.test(requestedDistDir) ? requestedDistDir : ".next";

if (requestedDistDir && resolvedDistDir !== requestedDistDir) {
  console.warn(`[next.config] Ignoring invalid NEXT_DIST_DIR: "${requestedDistDir}"`);
}

const nextConfig = {
  distDir: resolvedDistDir,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;

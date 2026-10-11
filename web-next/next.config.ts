import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep server.js at the image root even with the parent workspace lockfile.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;

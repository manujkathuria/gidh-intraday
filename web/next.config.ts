import type { NextConfig } from "next";

const buildWorkers = Number.parseInt(process.env.NEXT_BUILD_WORKERS ?? "0", 10);

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    cpus: Number.isFinite(buildWorkers) && buildWorkers > 0 ? buildWorkers : undefined,
  },
};

export default nextConfig;

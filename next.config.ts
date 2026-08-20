import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Recharts ships a large barrel file; this keeps client bundles lean.
    optimizePackageImports: ["recharts", "date-fns"],
  },
};

export default config;

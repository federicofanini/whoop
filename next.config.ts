import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The floating dev badge sits over the bottom-left of every page.
  devIndicators: false,
  experimental: {
    // Recharts ships a large barrel file; this keeps client bundles lean.
    optimizePackageImports: ["recharts", "date-fns"],
  },
};

export default config;

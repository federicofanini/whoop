import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The server name is one more thing to send on every response and one more
  // thing to tell an attacker.
  poweredByHeader: false,

  experimental: {
    // Recharts and date-fns both ship large barrel files; this rewrites the
    // imports to the individual modules so the bundler can drop what is unused.
    optimizePackageImports: ["recharts", "date-fns"],

    /*
     * How long the client router may reuse a page it already has.
     *
     * Every route here is `force-dynamic`, so the default of zero meant moving
     * between recovery and strain and back re-requested the whole page. Thirty
     * seconds makes the back button and the nav feel instant while keeping the
     * numbers current — a WHOOP cycle scores once a day, so half a minute of
     * staleness is well inside the resolution of the data itself.
     */
    staleTimes: { dynamic: 30, static: 180 },
  },

  images: {
    // Google profile pictures, for friend avatars.
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default config;

import type { NextConfig } from "next";

// cacheComponents/partialPrefetching are intentionally off: this app serves
// local mock data only, so the simpler default rendering model is enough.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The container image (Dockerfile) runs the self-contained server; data/ is copied next to it.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        // the fonts and images of the books change only with scripts/sync-data.sh
        source: "/:dir(fonts|resim)/:file*",
        headers: [{ key: "Cache-Control", value: "private, max-age=604800" }],
      },
    ];
  },
};

export default config;

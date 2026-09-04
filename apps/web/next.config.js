/** @type {import('next').NextConfig} */
const path = require("path");

const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || "http://localhost:5000";

const nextConfig = {
  ...(process.env.OUTPUT_STANDALONE === "true"
    ? { output: "standalone" }
    : {}),
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
      {
        source: "/api/products/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/singlepro/:id", destination: "/product/:id", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      { source: "/saree-view", destination: "/saree", permanent: true },
      { source: "/kurthi-view", destination: "/kurthi", permanent: true },
      { source: "/top-view", destination: "/top", permanent: true },
      { source: "/leggin-view", destination: "/leggin", permanent: true },
      { source: "/cosmetics-view", destination: "/cosmetics", permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const backendOrigin = (process.env.BACKEND_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER || process.env.NODE_ENV === "development";
  const distDir = process.env.NEXT_DIST_DIR || (isDev ? ".next-dev" : ".next");

  return {
    distDir,
    reactStrictMode: true,
    async rewrites() {
      return [
        {
          source: "/api/v1/:path*",
          destination: `${backendOrigin}/api/v1/:path*`,
        },
        {
          source: "/api/:path*",
          destination: `${backendOrigin}/api/:path*`,
        },
      ];
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            {
              key: "X-Frame-Options",
              value: "DENY",
            },
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            {
              key: "Referrer-Policy",
              value: "strict-origin-when-cross-origin",
            },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=()",
            },
            {
              key: "X-XSS-Protection",
              value: "1; mode=block",
            },
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
          ],
        },
      ];
    },
  };
}

import type { NextConfig } from "next";

/**
 * Target Spring Boot backend for the dev/SSR proxy. Configured server-side via
 * `BACKEND_URL` (NOT `NEXT_PUBLIC_*`, so it never ships to the browser).
 * Defaults to the local backend.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /**
   * Same-origin API proxy.
   *
   * The browser only ever calls `/api/*` on the Next.js origin; Next forwards
   * those requests to the Spring Boot backend on the server side. This removes
   * the need for CORS configuration on the backend entirely, since the actual
   * cross-origin hop happens server-to-server.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

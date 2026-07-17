import type { NextConfig } from "next";
import path from "path";

/**
 * Server-only escape hatch for running the frontend without the public Caddy
 * gateway (for example, an isolated container smoke test). In the deployed
 * stack, Caddy owns the same-origin `/api/*` route and this is intentionally
 * left unset.
 */
const apiProxyTarget = process.env.SIMPLE_API_PROXY_TARGET?.replace(/\/+$/, "");

const securityHeaders = [
  // Prevent browsers from MIME-sniffing away from the declared Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block the page from being embedded in an iframe (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Control referrer information sent with outbound requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable the legacy XSS auditor (it introduced its own vulnerabilities).
  { key: "X-XSS-Protection", value: "0" },
  // Opt out of browser features the app does not use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // Produces the minimal runtime server used by the production Docker image.
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  async rewrites() {
    if (!apiProxyTarget) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

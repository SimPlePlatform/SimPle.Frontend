import type { NextConfig } from "next";
import path from "path";

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
  outputFileTracingRoot: path.resolve(__dirname),
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

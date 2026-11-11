import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Our CSS is small; inlining it removes render-blocking requests on first visit (Lighthouse LCP on mobile).
  experimental: { inlineCss: true },
  // reference/ holds the approved concept. It's never imported or served.
  outputFileTracingExcludes: { "*": ["reference/**", "docs/**", "tests/**"] },
};

export default nextConfig;

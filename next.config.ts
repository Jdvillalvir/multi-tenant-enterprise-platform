import type { NextConfig } from "next";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  typedRoutes: true,
  serverExternalPackages: ["sharp"],
  images: { remotePatterns: [] },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : [])
    ];
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  allowedDevOrigins: allowedOrigins.length ? allowedOrigins : undefined
};

export default nextConfig;

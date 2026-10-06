import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor Node próprio (PM2 hoje, container na Fase 4).
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true }
};

export default nextConfig;

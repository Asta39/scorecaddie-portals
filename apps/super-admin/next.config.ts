import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly expose server-only env vars to the Edge middleware runtime.
  // Without this, non-NEXT_PUBLIC_ vars read as undefined in middleware.
  env: {
    SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL ?? '',
  },
  allowedDevOrigins: ['192.168.100.7'],
};

export default nextConfig;

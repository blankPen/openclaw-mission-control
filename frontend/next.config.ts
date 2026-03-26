import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In dev, Next may proxy requests based on the request origin/host.
  // Allow common local origins so `next dev --hostname 127.0.0.1` works
  // when users access via http://localhost:3000 or http://127.0.0.1:3000.
  // Keep the LAN IP as well for dev on the local network.
  allowedDevOrigins: ["192.168.1.101", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  // 将 workspace 名称传递给前端，用于区分不同 Agent 的 workspace
  env: {
    NEXT_PUBLIC_WORKSPACE_NAME: process.env.NEXT_PUBLIC_WORKSPACE_NAME || "",
  },
};

export default nextConfig;

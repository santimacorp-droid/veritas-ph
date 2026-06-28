import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/:path*`,
      },
      {
        source: "/projects",
        destination: "/cases",
      },
      {
        source: "/projects/:id",
        destination: "/cases/:id",
      },
    ];
  },
};

export default nextConfig;

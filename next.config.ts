import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "**.supabase.co"
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net"
      },
      {
        protocol: "https",
        hostname: "drive.google.com"
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com"
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com"
      },
      {
        protocol: "https",
        hostname: "s3.amazonaws.com"
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com"
      }
    ]
  },
  experimental: {
    optimizePackageImports: ["lucide-react"]
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;

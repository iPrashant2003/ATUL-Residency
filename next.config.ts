import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: "ibb.co",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3", "bcryptjs"],
  // Turbopack config: keep an empty object so Next.js doesn't error on
  // the webpack watchOptions we might add later.
  turbopack: {},
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: "/privacy", destination: "/privacypolicy", permanent: false },
      { source: "/terms", destination: "/termsandconditions", permanent: false },
      { source: "/forge-demo", destination: "/forge-demo.html", permanent: false },
      { source: "/war-game.html", destination: "/war-game", permanent: true },
    ];
  },
  async rewrites() {
    const gameApi =
      process.env.GAME_API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_GAME_API_URL ??
      "http://localhost:8001";
    const gameApiBase = gameApi.replace(/\/$/, "");

    return [
      { source: "/privacypolicy", destination: "/privacypolicy.html" },
      { source: "/termsandconditions", destination: "/termsandconditions.html" },
      { source: "/api/game/:path*", destination: `${gameApiBase}/:path*` },
    ];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

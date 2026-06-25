import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: "/privacy", destination: "/privacypolicy.html", permanent: false },
      { source: "/terms", destination: "/terms.html", permanent: false },
      { source: "/forge-demo", destination: "/forge-demo.html", permanent: false },
      { source: "/war-game", destination: "/war-game.html", permanent: false },
    ];
  },
};

export default nextConfig;

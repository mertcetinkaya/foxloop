import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: "/privacy", destination: "/privacypolicy", permanent: false },
      { source: "/terms", destination: "/termsandconditions", permanent: false },
      { source: "/forge-demo", destination: "/forge-demo.html", permanent: false },
      { source: "/war-game", destination: "/war-game.html", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/privacypolicy", destination: "/privacypolicy.html" },
      { source: "/termsandconditions", destination: "/termsandconditions.html" },
    ];
  },
};

export default nextConfig;

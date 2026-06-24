"use client";

import { useState } from "react";
import {
  Download,
  ChevronDown,
  Link2,
  Sparkles,
  Workflow,
  Monitor,
  Zap,
} from "lucide-react";

interface ForgeDownloadSectionProps {
  onDownload: () => void;
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: Link2,
    label: "Unity & Blender bridge",
    description: "Seamless pipeline between your favorite tools",
  },
  {
    icon: Sparkles,
    label: "Best-in-class AI tools",
    description: "Tripo, Hunyuan, Cursor & more — all in one place",
  },
  {
    icon: Workflow,
    label: "End-to-end workflow",
    description: "From concept to playable build without switching apps",
  },
  {
    icon: Monitor,
    label: "Cross-platform export",
    description: "Ship games for every platform from a single project",
  },
  {
    icon: Zap,
    label: "Pro & vibe-coding ready",
    description: "Built for studios and solo creators alike",
  },
];

const OTHER_PLATFORMS = ["Windows", "Linux", "Other versions"];

export function ForgeDownloadSection({ onDownload }: ForgeDownloadSectionProps) {
  const [platformsOpen, setPlatformsOpen] = useState(false);

  const handlePlatformClick = () => {
    setPlatformsOpen(false);
    onDownload();
  };

  return (
    <section className="relative overflow-x-hidden">
      {/* Cinematic background */}
      <div className="absolute inset-0 bg-[#030308]" />
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 85% 70%, rgba(249,115,22,0.25) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 15% 30%, rgba(168,85,247,0.15) 0%, transparent 50%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(236,72,153,0.08) 0%, transparent 40%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 60% 70%, white, transparent), radial-gradient(1px 1px at 50% 50%, white, transparent), radial-gradient(1px 1px at 80% 10%, white, transparent), radial-gradient(1px 1px at 10% 60%, white, transparent), radial-gradient(1px 1px at 90% 40%, white, transparent), radial-gradient(1.5px 1.5px at 33% 80%, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 70% 20%, white, transparent)",
          backgroundSize: "100% 100%",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-28 text-center sm:px-6 sm:pt-32">
        <h2 className="max-w-3xl text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
          The freedom to{" "}
          <span className="gradient-text">forge</span>
        </h2>

        <p className="mt-4 max-w-2xl text-base text-white/70 sm:text-lg">
          One studio for Unity, Blender, and the best AI tools in game
          development — from first sketch to shipped build.
        </p>

        <button
          onClick={onDownload}
          className="mt-8 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] hover:shadow-orange-500/30"
        >
          <Download className="h-5 w-5" />
          Download Forge
        </button>

        <div className="mt-4 flex flex-col items-center gap-1 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <AppleIcon className="h-4 w-4" />
            <span>macOS · Apple Silicon</span>
          </div>
          <span className="text-xs text-white/50">Coming soon · Free to try</span>
        </div>

        <div className="mt-10 grid w-full max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-sm transition-colors hover:border-orange-500/30 hover:bg-white/[0.07]"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-purple-600/20">
                <Icon className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-20 mt-8">
          <button
            onClick={() => setPlatformsOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-5 py-2.5 text-sm text-white/80 backdrop-blur-sm transition-colors hover:border-white/25 hover:bg-black/60 hover:text-white"
          >
            Windows, Linux, and other versions
            <ChevronDown
              className={`h-4 w-4 transition-transform ${platformsOpen ? "rotate-180" : ""}`}
            />
          </button>

          {platformsOpen && (
            <div className="absolute left-1/2 top-full z-30 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-white/15 bg-[#111113]/95 shadow-xl backdrop-blur-md">
              {OTHER_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  onClick={handlePlatformClick}
                  className="flex w-full items-center px-4 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {platform}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

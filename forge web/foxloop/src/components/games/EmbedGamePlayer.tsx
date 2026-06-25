"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Game } from "@/data/games";

interface EmbedGamePlayerProps {
  game: Game;
}

export function EmbedGamePlayer({ game }: EmbedGamePlayerProps) {
  if (!game.embedPath) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#0a0c10] text-white">
        <p className="text-muted">This game is not available yet.</p>
        <Link
          href="/all-games"
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to games
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <iframe
        src={game.embedPath}
        title={game.title}
        className="h-full w-full border-0"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-popups"
      />

      <div className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between p-4">
        <Link
          href="/all-games"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>
    </div>
  );
}

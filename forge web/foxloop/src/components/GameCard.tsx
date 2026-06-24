"use client";

import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import type { Game } from "@/data/games";

interface GameCardProps {
  game: Game;
  size?: "default" | "large";
}

export function GameCard({ game, size = "default" }: GameCardProps) {
  const isLarge = size === "large";
  const isPlayable = game.playable && (game.path || game.externalUrl);

  const cardContent = (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-border bg-card ${
          isLarge ? "aspect-[16/10]" : "aspect-[4/3]"
        }`}
      >
        <Image
          src={game.image}
          alt={game.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes={isLarge ? "50vw" : "25vw"}
        />

        {game.featured && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-pink-500/90 px-2.5 py-1 text-xs font-medium text-white">
            <span>★</span> Spotlight
          </div>
        )}

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
            isPlayable
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="absolute inset-0 bg-black/40" />
          <span
            className="relative z-10 flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform group-hover:scale-105"
          >
            <Play className="h-4 w-4 fill-black" />
            {isPlayable ? "Start Playing" : "Launching Soon"}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <h3
          className={`font-semibold transition-colors group-hover:text-orange-400 ${
            isLarge ? "text-lg" : "text-sm"
          }`}
        >
          {game.title}
        </h3>
        <p
          className={`mt-1 text-muted ${isLarge ? "text-sm" : "text-xs"}`}
        >
          {game.playCount} plays
        </p>
      </div>
    </>
  );

  if (isPlayable && game.externalUrl) {
    return (
      <a
        href={game.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block cursor-pointer"
      >
        {cardContent}
      </a>
    );
  }

  if (isPlayable && game.path) {
    return (
      <Link href={game.path} className="group block cursor-pointer">
        {cardContent}
      </Link>
    );
  }

  return <div className="group cursor-default">{cardContent}</div>;
}

"use client";

import type { Game } from "@/data/games";
import { GameCard } from "@/components/GameCard";
import { GameCardSkeleton } from "@/components/GameCardSkeleton";

interface AllGamesGridProps {
  initialGames: Game[];
}

export function AllGamesGrid({ initialGames }: AllGamesGridProps) {
  if (initialGames.length === 0) {
    return (
      <>
        {Array.from({ length: 9 }).map((_, i) => (
          <GameCardSkeleton key={i} size="large" />
        ))}
      </>
    );
  }

  return (
    <>
      {initialGames.map((game) => (
        <GameCard key={game.id} game={game} size="large" />
      ))}
    </>
  );
}

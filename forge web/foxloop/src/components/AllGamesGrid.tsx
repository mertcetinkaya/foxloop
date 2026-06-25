"use client";

import { useEffect, useState } from "react";
import { GAMES, type Game } from "@/data/games";
import { fetchPublishedGames } from "@/lib/game-api";
import { GameCard } from "@/components/GameCard";

export function AllGamesGrid() {
  const [published, setPublished] = useState<Game[]>([]);

  useEffect(() => {
    void fetchPublishedGames()
      .then(setPublished)
      .catch(() => setPublished([]));
  }, []);

  const byId = new Map<string, Game>();
  for (const game of GAMES) byId.set(game.id, game);
  for (const game of published) byId.set(game.id, game);

  return (
    <>
      {[...byId.values()].map((game) => (
        <GameCard key={game.id} game={game} size="large" />
      ))}
    </>
  );
}

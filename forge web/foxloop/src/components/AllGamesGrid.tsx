"use client";

import { useEffect, useState } from "react";
import { FORGE_LITE_GAMES, type Game } from "@/data/games";
import { fetchPublishedGames } from "@/lib/game-api";
import { mergePublishedWithStatic } from "@/lib/catalog";
import { GameCard } from "@/components/GameCard";

export function AllGamesGrid() {
  const [published, setPublished] = useState<Game[]>([]);

  useEffect(() => {
    void fetchPublishedGames()
      .then(setPublished)
      .catch(() => setPublished([]));
  }, []);

  const allLite = mergePublishedWithStatic(FORGE_LITE_GAMES, published);

  return (
    <>
      {allLite.map((game) => (
        <GameCard key={game.id} game={game} size="large" />
      ))}
    </>
  );
}

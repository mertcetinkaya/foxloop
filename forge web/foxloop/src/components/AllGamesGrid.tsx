"use client";

import { useEffect, useState } from "react";
import { GAMES, type Game } from "@/data/games";
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

  const allGames = mergePublishedWithStatic(GAMES, published);

  return (
    <>
      {allGames.map((game) => (
        <GameCard key={game.id} game={game} size="large" />
      ))}
    </>
  );
}

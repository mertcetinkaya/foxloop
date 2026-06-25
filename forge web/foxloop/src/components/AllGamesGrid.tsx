"use client";

import { useEffect, useState } from "react";
import type { Game } from "@/data/games";
import { fetchCatalog } from "@/lib/game-api";
import { staticCatalogFallback } from "@/lib/catalog";
import { GameCard } from "@/components/GameCard";

export function AllGamesGrid() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    void fetchCatalog()
      .then((catalog) => setGames(catalog.games))
      .catch(() => setGames(staticCatalogFallback().games));
  }, []);

  return (
    <>
      {games.map((game) => (
        <GameCard key={game.id} game={game} size="large" />
      ))}
    </>
  );
}

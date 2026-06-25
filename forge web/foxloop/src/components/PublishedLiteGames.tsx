"use client";

import { useCallback, useEffect, useState } from "react";
import type { Game } from "@/data/games";
import { fetchCatalog } from "@/lib/game-api";
import { staticCatalogFallback } from "@/lib/catalog";
import { GameCard } from "./GameCard";

interface PublishedLiteGamesProps {
  /** Max games to show (e.g. 21 on home). Omit for full list. */
  limit?: number;
}

export function PublishedLiteGames({ limit }: PublishedLiteGamesProps) {
  const [liteGames, setLiteGames] = useState<Game[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const catalog = await fetchCatalog();
      setLiteGames(catalog.lite);
    } catch {
      setLiteGames(staticCatalogFallback().lite);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const displayed = limit != null ? liteGames.slice(0, limit) : liteGames;
  const fallback = staticCatalogFallback().lite;
  const placeholders = limit != null ? Math.min(limit, fallback.length) : fallback.length;

  if (!loaded) {
    return (
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {fallback.slice(0, placeholders).map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {displayed.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

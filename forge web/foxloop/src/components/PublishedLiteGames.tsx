"use client";

import { useCallback, useEffect, useState } from "react";
import type { Game } from "@/data/games";
import { fetchCatalog } from "@/lib/game-api";
import { GameCard } from "./GameCard";
import { GameCardSkeleton } from "./GameCardSkeleton";

interface PublishedLiteGamesProps {
  /** Max games to show (e.g. 21 on home). Omit for full list. */
  limit?: number;
  catalogVersion?: number;
  initialLiteGames?: Game[];
}

export function PublishedLiteGames({
  limit,
  catalogVersion = 0,
  initialLiteGames,
}: PublishedLiteGamesProps) {
  const [liteGames, setLiteGames] = useState<Game[]>(initialLiteGames ?? []);
  const [ready, setReady] = useState(
    Boolean(initialLiteGames) && catalogVersion === 0
  );

  const load = useCallback(async () => {
    try {
      const catalog = await fetchCatalog();
      setLiteGames(catalog.lite);
    } catch {
      /* keep previous list */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (catalogVersion === 0 && initialLiteGames) {
      setLiteGames(initialLiteGames);
      setReady(true);
      return;
    }
    void load();
  }, [catalogVersion, initialLiteGames, load]);

  const displayed = limit != null ? liteGames.slice(0, limit) : liteGames;
  const skeletonCount = limit ?? 6;

  if (!ready) {
    return (
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <GameCardSkeleton key={i} />
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

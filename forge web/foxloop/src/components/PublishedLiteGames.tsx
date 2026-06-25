"use client";

import { useCallback, useEffect, useState } from "react";
import { FORGE_LITE_GAMES, type Game } from "@/data/games";
import { fetchPublishedGames } from "@/lib/game-api";
import { mergePublishedWithStatic } from "@/lib/catalog";
import { GameCard } from "./GameCard";

export function PublishedLiteGames() {
  const [published, setPublished] = useState<Game[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const games = await fetchPublishedGames();
      setPublished(games);
    } catch {
      setPublished([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allLite = mergePublishedWithStatic(FORGE_LITE_GAMES, published);

  if (!loaded) {
    return (
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FORGE_LITE_GAMES.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {allLite.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

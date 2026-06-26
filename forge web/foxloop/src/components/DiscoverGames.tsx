"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Game } from "@/data/games";
import type { CatalogResponse } from "@/lib/catalog";
import { fetchCatalog } from "@/lib/game-api";
import { GameCard } from "./GameCard";
import { GameCardSkeleton } from "./GameCardSkeleton";
import { PublishedLiteGames } from "./PublishedLiteGames";

interface DiscoverGamesProps {
  catalogVersion?: number;
  initialCatalog?: CatalogResponse | null;
}

const HOME_LITE_LIMIT = 21;

export function DiscoverGames({
  catalogVersion = 0,
  initialCatalog = null,
}: DiscoverGamesProps) {
  const [forgeGames, setForgeGames] = useState<Game[]>(
    initialCatalog?.forge ?? []
  );
  const [liteTotal, setLiteTotal] = useState<number | null>(
    initialCatalog?.total ?? null
  );
  const [catalogReady, setCatalogReady] = useState(Boolean(initialCatalog));

  useEffect(() => {
    if (catalogVersion === 0 && initialCatalog) {
      setForgeGames(initialCatalog.forge);
      setLiteTotal(initialCatalog.total);
      setCatalogReady(true);
      return;
    }

    let cancelled = false;
    setCatalogReady(false);

    void fetchCatalog()
      .then((catalog) => {
        if (cancelled) return;
        setForgeGames(catalog.forge);
        setLiteTotal(catalog.total);
        setCatalogReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [catalogVersion, initialCatalog]);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
            Game Jam
          </p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
            Forge{" "}
            <span className="gradient-text-orange">Games</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Explore titles crafted on the Forge platform. Play them, find
            inspiration, and build something of your own.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!catalogReady && forgeGames.length === 0 ? (
            Array.from({ length: 1 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))
          ) : (
            forgeGames.map((game) => <GameCard key={game.id} game={game} />)
          )}
        </div>

        <div className="mt-20 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
            Lite Catalog
          </p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
            Forge Lite{" "}
            <span className="gradient-text-orange">Games</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Explore games in the Forge Lite catalog. Play them instantly, or
            build something of your own above.
          </p>
        </div>

        <PublishedLiteGames
          limit={HOME_LITE_LIMIT}
          catalogVersion={catalogVersion}
          initialLiteGames={initialCatalog?.lite}
        />

        <div className="mt-12 flex justify-center">
          <Link
            href="/all-games"
            className="group relative flex items-center gap-3 rounded-full border border-border bg-card px-8 py-4 text-base font-medium text-white transition-all hover:border-orange-500/50 hover:bg-white/5"
          >
            Explore All Games
            <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-btn">
              <ArrowRight className="h-4 w-4 text-white" />
            </span>
            <span className="absolute -right-1 -top-2 rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold text-white">
              {liteTotal != null ? `${liteTotal}+` : "300+"}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

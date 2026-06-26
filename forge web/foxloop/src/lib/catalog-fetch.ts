import type { Game } from "@/data/games";
import type { CatalogResponse } from "@/lib/catalog";
import { publishedCoverUrl } from "@/lib/game-api";

const BASE =
  process.env.NEXT_PUBLIC_GAME_API_URL ?? "http://localhost:8001";

export function normalizeCatalogGame(game: Game): Game {
  if (game.image?.startsWith("/games/by-slug/")) {
    return {
      ...game,
      image: publishedCoverUrl(
        game.id,
        game.image,
        (game as Game & { publishedAt?: string }).publishedAt
      ),
    };
  }
  return game;
}

/** Live catalog from game-api. Returns null when the API is unreachable. */
export async function fetchCatalogFromApi(): Promise<CatalogResponse | null> {
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/catalog`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      forge: Game[];
      lite: Game[];
      games: Game[];
      total: number;
    };
    return {
      forge: data.forge.map(normalizeCatalogGame),
      lite: data.lite.map(normalizeCatalogGame),
      games: data.games.map(normalizeCatalogGame),
      total: data.total,
    };
  } catch {
    return null;
  }
}

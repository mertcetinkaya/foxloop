import type { Game } from "@/data/games";
import { EMBED_GAMES, FORGE_GAMES, FORGE_LITE_GAMES, GAMES } from "@/data/games";

export interface CatalogResponse {
  forge: Game[];
  lite: Game[];
  games: Game[];
  total: number;
}

/** Fallback when game-api catalog is unavailable (local dev / offline). */
export function staticCatalogFallback(): CatalogResponse {
  const lite = [...FORGE_LITE_GAMES, ...EMBED_GAMES];
  return {
    forge: FORGE_GAMES,
    lite,
    games: GAMES,
    total: GAMES.length,
  };
}

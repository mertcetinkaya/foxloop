import type { Game } from "@/data/games";

/** Published AI games first (newest), static showcase games last. */
export function mergePublishedWithStatic(
  staticGames: Game[],
  published: Game[]
): Game[] {
  const staticIds = new Set(staticGames.map((g) => g.id));
  const publishedOnly = published.filter((p) => !staticIds.has(p.id));
  return [...publishedOnly, ...staticGames];
}

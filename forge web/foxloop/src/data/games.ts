import catalog from "./games.json";

export interface Game {
  id: string;
  title: string;
  image: string;
  playCount: string;
  featured?: boolean;
  playable?: boolean;
  path?: string;
  externalUrl?: string;
  embedPath?: string;
  source?: string;
  license?: string;
}

interface GameCatalog {
  forge: Game[];
  native: Game[];
  embed: Game[];
}

const gameCatalog = catalog as GameCatalog;

export const FORGE_GAMES: Game[] = gameCatalog.forge;
export const FORGE_LITE_GAMES: Game[] = gameCatalog.native;
export const EMBED_GAMES: Game[] = gameCatalog.embed;

export const GAMES: Game[] = [
  ...FORGE_GAMES,
  ...FORGE_LITE_GAMES,
  ...EMBED_GAMES,
];

export function getGameById(id: string): Game | undefined {
  return GAMES.find((game) => game.id === id);
}

export function getEmbedGameBySlug(slug: string): Game | undefined {
  return EMBED_GAMES.find((game) => game.id === slug);
}

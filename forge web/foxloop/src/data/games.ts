export interface Game {
  id: string;
  title: string;
  image: string;
  playCount: string;
  featured?: boolean;
  playable?: boolean;
  path?: string;
  externalUrl?: string;
}

export const FORGE_LITE_GAMES: Game[] = [
  {
    id: "penalty-fever",
    title: "Penalty Fever",
    image: "/games/penalty-fever.jpg",
    playCount: "7.8 K",
    featured: true,
    playable: true,
    path: "/games/penalty-fever",
  },
  {
    id: "eat-smaller-fish",
    title: "Eat the Smaller Fish",
    image: "/games/eat-smaller-fish.jpg",
    playCount: "29.1 K",
    featured: true,
    playable: true,
    path: "/games/eat-smaller-fish",
  },
  {
    id: "arrow-out",
    title: "Arrow Out",
    image: "/games/arrow-out.jpg",
    playCount: "28.3 K",
    featured: true,
    playable: true,
    path: "/games/arrow-out",
  },
  {
    id: "city-race",
    title: "City Race",
    image: "/games/city-race.jpg",
    playCount: "12.4 K",
    featured: true,
    playable: true,
    path: "/games/city-race",
  },
  {
    id: "brawl-arena",
    title: "Brawl Arena",
    image: "/games/brawl-arena.jpg",
    playCount: "18.7 K",
    featured: true,
    playable: true,
    path: "/games/brawl-arena",
  },
];

export const FORGE_GAMES: Game[] = [
  {
    id: "wrath-of-passchendaele",
    title: "Wrath of Passchendaele",
    image: "/games/wrath-of-passchendaele.jpg",
    playCount: "31.5 K",
    featured: true,
    playable: true,
    externalUrl: "https://foxloop.ai/war-game",
  },
];

export const GAMES: Game[] = [...FORGE_GAMES, ...FORGE_LITE_GAMES];

export function getGameById(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

import type {
  CatalogGameDoc,
  CatalogKind,
  GameDoc,
  PublishedGameCard,
  TrafficTier,
} from "../types.js";
import { getStore } from "./store.js";
import { listCatalogGames } from "./catalog-store.js";
import { resolveGameTitle } from "./game-service.js";
import {
  assignTrafficSeed,
  computePlayCount,
  formatPlayCount,
  WRATH_SLUG,
} from "./play-count.js";

const SPOTLIGHT_COUNT = 10;

interface PlaySeed {
  slug: string;
  playCountBase: number;
  seededAt: string;
  trafficTier: TrafficTier;
}

function resolvePlaySeed(
  slug: string,
  partial?: Partial<PlaySeed>
): PlaySeed {
  if (
    partial?.playCountBase != null &&
    partial.seededAt &&
    partial.trafficTier != null
  ) {
    return {
      slug,
      playCountBase: partial.playCountBase,
      seededAt: partial.seededAt,
      trafficTier: partial.trafficTier,
    };
  }
  const assigned = assignTrafficSeed(slug);
  return {
    slug,
    playCountBase: assigned.playCountBase,
    seededAt: partial?.seededAt ?? new Date().toISOString(),
    trafficTier: assigned.trafficTier,
  };
}

function catalogDocToCard(
  doc: CatalogGameDoc,
  featured: boolean
): PublishedGameCard & { kind: CatalogKind; playCountNumeric: number } {
  const seed = resolvePlaySeed(doc.slug, {
    playCountBase: doc.playCountBase,
    seededAt: doc.seededAt,
    trafficTier: doc.trafficTier,
  });
  const numeric = computePlayCount(
    seed.slug,
    seed.playCountBase,
    seed.seededAt,
    seed.trafficTier
  );

  return {
    id: doc.slug,
    title: doc.title,
    image: doc.image,
    playCount: formatPlayCount(numeric),
    path: doc.path ?? (doc.kind === "embed" ? `/play/${doc.slug}` : undefined),
    externalUrl: doc.externalUrl,
    playable: doc.playable,
    featured,
    kind: doc.kind,
    publishedAt: doc.seededAt,
    playCountNumeric: numeric,
  };
}

function generatedDocToCard(
  game: GameDoc,
  featured: boolean
): PublishedGameCard & { kind: CatalogKind; playCountNumeric: number } {
  const seed = resolvePlaySeed(game.slug, {
    playCountBase: game.playCountBase,
    seededAt: game.seededAt ?? game.publishedAt ?? game.createdAt,
    trafficTier: game.trafficTier,
  });
  const numeric = computePlayCount(
    seed.slug,
    seed.playCountBase,
    seed.seededAt,
    seed.trafficTier
  );

  return {
    id: game.slug,
    title: resolveGameTitle(game),
    image: game.coverUrl ?? `/games/by-slug/${encodeURIComponent(game.slug)}/cover`,
    playCount: formatPlayCount(numeric),
    path: `/games/${game.slug}`,
    playable: true,
    featured,
    buildStatus: game.buildStatus,
    publishedAt: game.publishedAt,
    kind: "generated",
    playCountNumeric: numeric,
  };
}

function applySpotlight<T extends { id: string; playCountNumeric: number; featured?: boolean }>(
  cards: T[]
): T[] {
  const ranked = [...cards].sort(
    (a, b) => b.playCountNumeric - a.playCountNumeric
  );
  const spotlightIds = new Set(
    ranked.slice(0, SPOTLIGHT_COUNT).map((c) => c.id)
  );
  return cards.map((c) => ({
    ...c,
    featured: spotlightIds.has(c.id),
  }));
}

function sortLiteGames(
  cards: (PublishedGameCard & { kind: CatalogKind; playCountNumeric: number })[]
) {
  return [...cards].sort((a, b) => {
    if (a.kind === "generated" && b.kind === "generated") {
      return (
        new Date(b.publishedAt ?? 0).getTime() -
        new Date(a.publishedAt ?? 0).getTime()
      );
    }
    if (a.kind === "generated") return -1;
    if (b.kind === "generated") return 1;
    return a.title.localeCompare(b.title);
  });
}

export async function buildCatalogResponse(): Promise<{
  forge: PublishedGameCard[];
  lite: PublishedGameCard[];
  games: PublishedGameCard[];
  total: number;
}> {
  const catalogDocs = await listCatalogGames().catch(() => [] as CatalogGameDoc[]);
  const catalogSlugs = new Set(catalogDocs.map((d) => d.slug));

  let generated: GameDoc[] = [];
  try {
    const store = await getStore();
    generated = await store.listPublished();
  } catch {
    generated = [];
  }

  const generatedOnly = generated.filter((g) => !catalogSlugs.has(g.slug));

  const forgeDocs = catalogDocs.filter(
    (d) => d.kind === "external" || d.slug === WRATH_SLUG
  );
  const liteDocs = catalogDocs.filter(
    (d) => d.kind !== "external" && d.slug !== WRATH_SLUG
  );

  let allCards = [
    ...forgeDocs.map((d) => catalogDocToCard(d, false)),
    ...liteDocs.map((d) => catalogDocToCard(d, false)),
    ...generatedOnly.map((g) => generatedDocToCard(g, false)),
  ];

  allCards = applySpotlight(allCards);

  const forge = allCards
    .filter((c) => c.id === WRATH_SLUG || forgeDocs.some((d) => d.slug === c.id))
    .map(({ playCountNumeric: _n, kind: _k, ...card }) => card);

  const liteSorted = sortLiteGames(
    allCards.filter(
      (c) => c.id !== WRATH_SLUG && !forgeDocs.some((d) => d.slug === c.id)
    )
  ).map(({ playCountNumeric: _n, kind: _k, ...card }) => card);

  const games = [...forge, ...liteSorted];

  return {
    forge,
    lite: liteSorted,
    games,
    total: games.length,
  };
}

export function trafficSeedForPublish(slug: string): {
  trafficTier: TrafficTier;
  playCountBase: number;
  seededAt: string;
} {
  const { trafficTier, playCountBase } = assignTrafficSeed(slug);
  return {
    trafficTier,
    playCountBase,
    seededAt: new Date().toISOString(),
  };
}

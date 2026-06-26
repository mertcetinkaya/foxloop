export type TrafficTier = 1 | 2 | 3 | "wrath";

export const WRATH_SLUG = "wrath-of-passchendaele";

const TIER_BASE: Record<1 | 2 | 3, { min: number; max: number }> = {
  1: { min: 2500, max: 10000 },
  2: { min: 10000, max: 20000 },
  3: { min: 20000, max: 30000 },
};

const TIER_HOURLY: Record<TrafficTier, { min: number; max: number }> = {
  1: { min: 20, max: 80 },
  2: { min: 60, max: 140 },
  3: { min: 120, max: 200 },
  wrath: { min: 150, max: 250 },
};

function hashSeed(slug: string, hourIndex: number): number {
  let h = 0;
  const s = `${slug}:${hourIndex}`;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function hourlyDelta(
  slug: string,
  hourIndex: number,
  min: number,
  max: number
): number {
  const span = max - min + 1;
  return min + (hashSeed(slug, hourIndex) % span);
}

/** Deterministic play total from seed time and traffic tier. */
export function computePlayCount(
  slug: string,
  playCountBase: number,
  seededAt: string,
  tier: TrafficTier
): number {
  const start = new Date(seededAt).getTime();
  if (Number.isNaN(start)) return playCountBase;

  const hours = Math.max(0, Math.floor((Date.now() - start) / 3_600_000));
  const { min, max } = TIER_HOURLY[tier];
  let total = playCountBase;
  for (let h = 0; h < hours; h += 1) {
    total += hourlyDelta(slug, h, min, max);
  }
  return total;
}

/** x.y K with single decimal; below 100 → "0". */
export function formatPlayCount(count: number): string {
  if (count < 100) return "0";
  const k = Math.round((count / 1000) * 10) / 10;
  return `${k.toFixed(1)} K`;
}

export function playCountForGame(game: {
  slug: string;
  status: string;
  trafficTier?: TrafficTier;
  playCountBase?: number;
  seededAt?: string;
}): string {
  if (
    game.status !== "published" ||
    game.trafficTier == null ||
    !game.seededAt
  ) {
    return "0";
  }
  const numeric = computePlayCount(
    game.slug,
    game.playCountBase ?? 0,
    game.seededAt,
    game.trafficTier
  );
  return formatPlayCount(numeric);
}

export function randomTierFromSlug(slug: string): 1 | 2 | 3 {
  const h = hashSeed(slug, 0);
  return ((h % 3) + 1) as 1 | 2 | 3;
}

export function randomBaseForTier(tier: 1 | 2 | 3, slug: string): number {
  const { min, max } = TIER_BASE[tier];
  const span = max - min + 1;
  return min + (hashSeed(slug, 999) % span);
}

export function wrathTrafficSeed(): {
  trafficTier: "wrath";
  playCountBase: number;
} {
  return { trafficTier: "wrath", playCountBase: 41500 };
}

export function assignTrafficSeed(slug: string): {
  trafficTier: TrafficTier;
  playCountBase: number;
} {
  if (slug === WRATH_SLUG) return wrathTrafficSeed();
  const trafficTier = randomTierFromSlug(slug);
  return {
    trafficTier,
    playCountBase: randomBaseForTier(trafficTier, slug),
  };
}

/** Catalog games: count hourly growth from seed time (base is the starting display). */
export function catalogSeededAtNow(): string {
  return new Date().toISOString();
}

export function numericPlayCount(playCountLabel: string): number {
  if (playCountLabel === "0") return 0;
  const m = playCountLabel.match(/^([\d.]+)\s*K$/i);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]!) * 1000);
}

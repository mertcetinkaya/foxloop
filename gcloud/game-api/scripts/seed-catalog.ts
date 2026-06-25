/**
 * Seed Firestore catalogGames from forge web games.json
 * Usage: npm run seed-catalog
 */
import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { saveCatalogGamesBatch } from "../src/services/catalog-store.js";
import type { CatalogGameDoc, CatalogKind } from "../src/types.js";
import {
  assignTrafficSeed,
  catalogSeededAt,
  wrathTrafficSeed,
  WRATH_SLUG,
} from "../src/services/play-count.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

interface JsonGame {
  id: string;
  title: string;
  image: string;
  playable?: boolean;
  path?: string;
  externalUrl?: string;
  embedPath?: string;
  source?: string;
  license?: string;
}

interface GamesJson {
  forge: JsonGame[];
  native: JsonGame[];
  embed: JsonGame[];
}

function toCatalogDoc(
  game: JsonGame,
  kind: CatalogKind
): CatalogGameDoc {
  const isWrath = game.id === WRATH_SLUG;
  const traffic = isWrath ? wrathTrafficSeed() : assignTrafficSeed(game.id);

  return {
    slug: game.id,
    title: game.title,
    kind: isWrath ? "external" : kind,
    image: game.image,
    path: game.path,
    externalUrl: game.externalUrl,
    embedPath: game.embedPath ?? (kind === "embed" ? `/embed/${game.id}/index.html` : undefined),
    playable: game.playable ?? true,
    trafficTier: traffic.trafficTier,
    playCountBase: traffic.playCountBase,
    seededAt: catalogSeededAt(game.id),
    source: game.source,
    license: game.license,
  };
}

async function main() {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    console.error("GOOGLE_CLOUD_PROJECT must be set in .env");
    process.exit(1);
  }

  const jsonPath =
    process.env.FOXLOOP_GAMES_JSON ??
    path.resolve(__dirname, "../../../forge web/foxloop/src/data/games.json");

  if (!fs.existsSync(jsonPath)) {
    console.error(`games.json not found at ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as GamesJson;
  const docs: CatalogGameDoc[] = [
    ...data.forge.map((g) => toCatalogDoc(g, "external")),
    ...data.native.map((g) => toCatalogDoc(g, "native")),
    ...data.embed.map((g) => toCatalogDoc(g, "embed")),
  ];

  console.log(`Seeding ${docs.length} catalog games to Firestore...`);
  await saveCatalogGamesBatch(docs);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

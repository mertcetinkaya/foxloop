import { Firestore } from "@google-cloud/firestore";
import type { CatalogGameDoc } from "../types.js";
import { config } from "../config.js";

const COLLECTION = "catalogGames";

function db(): Firestore {
  if (!config.gcpProject) {
    throw new Error("GOOGLE_CLOUD_PROJECT is not configured");
  }
  return new Firestore({ projectId: config.gcpProject });
}

export async function listCatalogGames(): Promise<CatalogGameDoc[]> {
  const snap = await db().collection(COLLECTION).get();
  return snap.docs.map((d) => d.data() as CatalogGameDoc);
}

export async function getCatalogGameBySlug(
  slug: string
): Promise<CatalogGameDoc | null> {
  const doc = await db().collection(COLLECTION).doc(slug).get();
  return doc.exists ? (doc.data() as CatalogGameDoc) : null;
}

export async function saveCatalogGame(game: CatalogGameDoc): Promise<void> {
  await db().collection(COLLECTION).doc(game.slug).set(game, { merge: true });
}

export async function saveCatalogGamesBatch(
  games: CatalogGameDoc[]
): Promise<void> {
  const firestore = db();
  const batchSize = 400;
  for (let i = 0; i < games.length; i += batchSize) {
    const batch = firestore.batch();
    for (const game of games.slice(i, i + batchSize)) {
      batch.set(firestore.collection(COLLECTION).doc(game.slug), game, {
        merge: true,
      });
    }
    await batch.commit();
  }
}

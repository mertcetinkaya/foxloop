/**
 * Remove test games created from prompt "test" / title "Test Rush" from Firestore + workspaces.
 * Usage: npm run purge-test-games
 */
import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getStore } from "../src/services/store.js";
import { removeWorkspace } from "../src/services/workspace.js";
import type { GameDoc } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

function isTestGame(game: GameDoc): boolean {
  const prompt = game.userPrompt?.trim().toLowerCase() ?? "";
  const title = game.title?.trim().toLowerCase() ?? "";
  const slug = game.slug?.trim().toLowerCase() ?? "";

  if (prompt === "test") return true;
  if (title === "test rush" || title === "test") return true;
  if (slug === "test" || slug === "test-rush" || /^test-\d+$/.test(slug)) return true;

  return false;
}

async function main() {
  const store = await getStore();
  const { config } = await import("../src/config.js");

  let candidates: GameDoc[] = [];

  if (config.useFirestore) {
    const { Firestore } = await import("@google-cloud/firestore");
    const db = new Firestore({ projectId: config.gcpProject });
    const snap = await db.collection("games").get();
    candidates = snap.docs.map((d) => d.data() as GameDoc);
  } else {
    const slugs = await store.listSlugs();
    for (const slug of slugs) {
      const game = await store.getGameBySlug(slug);
      if (game) candidates.push(game);
    }
  }

  const toDelete = candidates.filter(isTestGame);

  if (toDelete.length === 0) {
    console.log("No test games found.");
    return;
  }

  for (const game of toDelete) {
    console.log(`Deleting ${game.id} (${game.slug}) — ${game.title}`);
    await store.deleteGame(game.id);
    await removeWorkspace(game.id);
  }

  console.log(`Removed ${toDelete.length} test game(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

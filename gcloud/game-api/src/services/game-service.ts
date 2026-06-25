import type { GameDoc, ChatMessage } from "../types.js";
import { getStore, loadFilesToWorkspace, syncWorkspaceToStore } from "./store.js";
import {
  initWorkspaceFromScaffold,
  removeWorkspace,
  workspaceDir,
} from "./workspace.js";
import {
  isCursorConfigured,
  runBuilder,
  runEditor,
  runPlanner,
} from "./cursor.js";
import {
  expiresAt,
  newId,
  nowIso,
  slugify,
  titleFromSlug,
  uniqueSlug,
} from "../utils.js";
import { config, requireFirestore } from "../config.js";

async function addChat(
  gameId: string,
  partial: Omit<ChatMessage, "id" | "createdAt">
) {
  const store = await getStore();
  const msg: ChatMessage = {
    id: newId(),
    createdAt: nowIso(),
    ...partial,
  };
  await store.addChat(gameId, msg);
  return msg;
}

async function updateGame(game: GameDoc, patch: Partial<GameDoc>) {
  const store = await getStore();
  const next = { ...game, ...patch, updatedAt: nowIso() };
  await store.saveGame(next);
  return next;
}

function extractTitle(plan: string, fallback: string): string {
  const match = plan.match(/^#\s*(.+)$/m) || plan.match(/Title:\s*(.+)$/im);
  return match?.[1]?.trim() || fallback;
}

export async function createGameFromPrompt(userPrompt: string): Promise<GameDoc> {
  const store = await getStore();
  const slugs = await store.listSlugs();
  const baseSlug = slugify(userPrompt);
  const slug = uniqueSlug(baseSlug, slugs);
  const id = newId();
  const now = nowIso();

  let game: GameDoc = {
    id,
    slug,
    title: titleFromSlug(slug),
    status: "planning",
    userPrompt,
    createdAt: now,
    updatedAt: now,
    expiresAt: expiresAt(config.draftTtlHours),
  };
  await store.saveGame(game);
  await addChat(id, { role: "user", type: "prompt", text: userPrompt });

  try {
    if (!isCursorConfigured()) {
      throw new Error("CURSOR_API_KEY is not configured on the game API server");
    }

    const plan = await runPlanner(userPrompt);
    game = await updateGame(game, {
      status: "generating",
      gamePlan: plan,
      title: extractTitle(plan, game.title),
    });
    await addChat(id, { role: "assistant", type: "plan", text: plan });

    const dir = await initWorkspaceFromScaffold(id);
    const { agentId, assistantText } = await runBuilder(dir, plan, slug);
    await syncWorkspaceToStore(store, id, dir);
    await addChat(id, {
      role: "assistant",
      type: "generation",
      text: assistantText || "Game files generated in workspace.",
    });

    game = await updateGame(game, {
      status: "ready",
      agentId,
    });
    return game;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    game = await updateGame(game, {
      status: "failed",
      errorMessage: message,
    });
    await addChat(id, { role: "assistant", type: "error", text: message });
    throw err;
  }
}

export async function editGameDraft(
  gameId: string,
  userEdit: string
): Promise<GameDoc> {
  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (game.status === "published") {
    throw new Error("Published games cannot be edited");
  }
  if (!game.agentId || !game.gamePlan) {
    throw new Error("Draft is missing agent session or plan");
  }

  await addChat(gameId, { role: "user", type: "prompt", text: userEdit });
  let updated = await updateGame(game, { status: "generating" });

  try {
    const dir = workspaceDir(gameId);
    await loadFilesToWorkspace(store, gameId, dir);
    await runEditor(game.agentId, dir, userEdit, game.gamePlan);
    await syncWorkspaceToStore(store, gameId, dir);
    const text = "Applied your changes to the draft.";
    await addChat(gameId, { role: "assistant", type: "edit", text });
    updated = await updateGame(updated, { status: "ready" });
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    updated = await updateGame(updated, {
      status: "failed",
      errorMessage: message,
    });
    await addChat(gameId, { role: "assistant", type: "error", text: message });
    throw err;
  }
}

export async function publishGame(gameId: string): Promise<GameDoc> {
  requireFirestore();

  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  if (game.status !== "ready") {
    throw new Error("Game must be ready before publish");
  }

  const files = await store.getFiles(gameId);
  if (!files.length) {
    throw new Error("No game files to publish");
  }

  const updated = await updateGame(game, {
    status: "published",
    buildStatus: "live",
    publishedAt: nowIso(),
    coverUrl: game.coverUrl ?? `/games/${game.slug}.jpg`,
  });

  await removeWorkspace(gameId);
  await addChat(gameId, {
    role: "assistant",
    type: "status",
    text: "Game saved to the Forge Lite catalog (Firestore).",
  });
  return updated;
}

export async function getPublishedGameBySlug(slug: string): Promise<GameDoc> {
  const store = await getStore();
  const game = await store.getGameBySlug(slug);
  if (!game || game.status !== "published") {
    throw new Error("Game not found");
  }
  return game;
}

export async function deleteDraft(gameId: string): Promise<void> {
  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) return;
  if (game.status === "published") {
    throw new Error("Cannot delete published game from draft API");
  }
  await store.deleteGame(gameId);
  await removeWorkspace(gameId);
}

export async function getGameOrThrow(gameId: string): Promise<GameDoc> {
  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  return game;
}

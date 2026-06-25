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

const GENERIC_TITLE = /^(title|untitled|new game|game)$/i;

function extractTitle(
  plan: string,
  userPrompt: string,
  fallback: string
): string {
  const section = plan.match(/^##\s*Title\s*\n+([^\n#]+)/im);
  if (section?.[1]?.trim() && !GENERIC_TITLE.test(section[1].trim())) {
    return section[1].trim().slice(0, 80);
  }

  const titleLine = plan.match(/^Title:\s*(.+)$/im);
  if (titleLine?.[1]?.trim() && !GENERIC_TITLE.test(titleLine[1].trim())) {
    return titleLine[1].trim().slice(0, 80);
  }

  const h1 = plan.match(/^#\s*(.+)$/m);
  if (h1?.[1]?.trim() && !GENERIC_TITLE.test(h1[1].trim())) {
    return h1[1].trim().slice(0, 80);
  }

  const fromPrompt = userPrompt.trim();
  if (fromPrompt) {
    const cleaned = fromPrompt.charAt(0).toUpperCase() + fromPrompt.slice(1);
    return cleaned.slice(0, 80);
  }

  return fallback;
}

export function resolveGameTitle(game: GameDoc): string {
  if (game.title?.trim() && !GENERIC_TITLE.test(game.title.trim())) {
    return game.title.trim();
  }
  if (game.gamePlan) {
    return extractTitle(game.gamePlan, game.userPrompt, titleFromSlug(game.slug));
  }
  if (game.userPrompt?.trim()) {
    const p = game.userPrompt.trim();
    return (p.charAt(0).toUpperCase() + p.slice(1)).slice(0, 80);
  }
  return titleFromSlug(game.slug);
}

export function coverPathForSlug(slug: string): string {
  return `/games/by-slug/${encodeURIComponent(slug)}/cover`;
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
      title: extractTitle(plan, userPrompt, game.title),
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

  const title = resolveGameTitle(game);
  const updated = await updateGame(game, {
    title,
    status: "published",
    buildStatus: "live",
    publishedAt: nowIso(),
    coverUrl: coverPathForSlug(game.slug),
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

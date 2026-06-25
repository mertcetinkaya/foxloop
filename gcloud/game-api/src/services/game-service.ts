import type { GameDoc, ChatMessage } from "../types.js";
import type { AuthUser } from "../middleware/auth.js";
import { getStore, loadFilesToWorkspace, syncWorkspaceToStore } from "./store.js";
import {
  copyReferenceGamesToWorkspace,
  initWorkspaceFromScaffold,
  removeWorkspace,
  workspaceDir,
} from "./workspace.js";
import { isCursorConfigured, runBuildPipeline, runEditor } from "./cursor.js";
import {
  expiresAt,
  newId,
  nowIso,
  slugify,
  uniqueSlug,
} from "../utils.js";
import { config, requireFirestore } from "../config.js";
import { generateFallbackCoverJpeg } from "./cover-image.js";
import { trafficSeedForPublish } from "./catalog-service.js";
import { generateCoverForCreate } from "./cover-ai.js";
import { summarizeEdit, summarizeGameReady } from "./chat-summary.js";
import { deriveLockedTitle, resolveGameTitle } from "./title.js";

async function addChat(
  gameId: string,
  partial: Omit<ChatMessage, "id" | "createdAt">
) {
  const store = await getStore();
  const msg = {
    id: newId(),
    createdAt: nowIso(),
    ...partial,
  };
  await store.addChat(gameId, msg);
  return msg;
}

function applyLockedFields(game: GameDoc, patch: Partial<GameDoc>): Partial<GameDoc> {
  const next = { ...patch };
  if (game.titleLocked && next.title !== undefined && next.title !== game.title) {
    delete next.title;
  }
  if (game.coverLocked && game.coverImageBase64 && next.coverImageBase64 !== undefined) {
    delete next.coverImageBase64;
  }
  if (game.coverLocked && game.coverUrl && next.coverUrl !== undefined) {
    delete next.coverUrl;
  }
  return next;
}

async function updateGame(game: GameDoc, patch: Partial<GameDoc>) {
  const store = await getStore();
  const safePatch = applyLockedFields(game, patch);
  const next = { ...game, ...safePatch, updatedAt: nowIso() };
  await store.saveGame(next);
  return next;
}

export function assertGameOwner(game: GameDoc, ownerUid: string): void {
  if (!game.ownerUid) {
    throw new Error("Game has no owner");
  }
  if (game.ownerUid !== ownerUid) {
    throw new Error("Not authorized to access this game");
  }
}

export function coverPathForSlug(slug: string): string {
  return `/games/by-slug/${encodeURIComponent(slug)}/cover`;
}

export { resolveGameTitle } from "./title.js";

export async function createGameFromPrompt(
  userPrompt: string,
  owner: AuthUser
): Promise<GameDoc> {
  const store = await getStore();
  const slugs = await store.listSlugs();
  const baseSlug = slugify(userPrompt);
  const slug = uniqueSlug(baseSlug, slugs);
  const id = newId();
  const now = nowIso();

  const lockedTitle = await deriveLockedTitle(userPrompt);

  let game: GameDoc = {
    id,
    slug,
    title: lockedTitle,
    titleLocked: true,
    coverLocked: true,
    ownerUid: owner.uid,
    ownerEmail: owner.email,
    status: "generating",
    gameBuildStatus: "building",
    coverStatus: "generating",
    coverUrl: coverPathForSlug(slug),
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

    const coverInput = {
      title: lockedTitle,
      slug,
      userPrompt,
      skipAgentPrompt: true,
    };

    const coverPromise = generateCoverForCreate(coverInput);

    const buildPromise = (async () => {
      const dir = await initWorkspaceFromScaffold(id);
      await copyReferenceGamesToWorkspace(dir);
      const builderResult = await runBuildPipeline(dir, slug, userPrompt);
      await syncWorkspaceToStore(store, id, dir);
      return builderResult;
    })();

    const [coverJpeg, builderResult] = await Promise.all([
      coverPromise,
      buildPromise,
    ]);

    const revealText = await summarizeGameReady(
      lockedTitle,
      userPrompt,
      builderResult.gamePlan
    );

    await addChat(id, {
      role: "assistant",
      type: "generation",
      text: revealText,
    });

    game = await updateGame(game, {
      agentId: builderResult.agentId,
      gamePlan: builderResult.gamePlan,
      coverImageBase64: coverJpeg.toString("base64"),
      gameBuildStatus: "ready",
      coverStatus: "ready",
      status: "ready",
    });
    return game;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    game = await updateGame(game, {
      status: "failed",
      gameBuildStatus: "failed",
      coverStatus: game.coverImageBase64 ? "ready" : "failed",
      errorMessage: message,
    });
    await addChat(id, { role: "assistant", type: "error", text: message });
    throw err;
  }
}

export async function listMyGames(ownerUid: string): Promise<GameDoc[]> {
  const store = await getStore();
  return store.listByOwner(ownerUid);
}

export async function editGameDraft(
  gameId: string,
  userEdit: string,
  ownerUid: string
): Promise<GameDoc> {
  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  assertGameOwner(game, ownerUid);
  if (game.status === "published") {
    throw new Error("Published games cannot be edited");
  }
  if (!game.agentId || !game.gamePlan) {
    throw new Error("Draft is missing agent session or plan");
  }

  await addChat(gameId, { role: "user", type: "edit", text: userEdit });
  let updated = await updateGame(game, {
    status: "generating",
    gameBuildStatus: "building",
  });

  try {
    const dir = workspaceDir(gameId);
    await loadFilesToWorkspace(store, gameId, dir);
    await runEditor(game.agentId, dir, userEdit, game.gamePlan);
    await syncWorkspaceToStore(store, gameId, dir);
    const revealText = await summarizeEdit(
      userEdit,
      resolveGameTitle(game),
      game.gamePlan
    );
    await addChat(gameId, { role: "assistant", type: "edit", text: revealText });
    updated = await updateGame(updated, {
      status: "ready",
      gameBuildStatus: "ready",
    });
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    updated = await updateGame(updated, {
      status: "failed",
      gameBuildStatus: "failed",
      errorMessage: message,
    });
    await addChat(gameId, { role: "assistant", type: "error", text: message });
    throw err;
  }
}

export async function publishGame(gameId: string, ownerUid: string): Promise<GameDoc> {
  requireFirestore();

  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  assertGameOwner(game, ownerUid);
  if (game.status !== "ready") {
    throw new Error("Game must be ready before publish");
  }

  const files = await store.getFiles(gameId);
  if (!files.length) {
    throw new Error("No game files to publish");
  }

  let coverJpeg: Buffer;
  if (game.coverImageBase64) {
    coverJpeg = Buffer.from(game.coverImageBase64, "base64");
  } else {
    coverJpeg = await generateFallbackCoverJpeg({
      title: resolveGameTitle(game),
      slug: game.slug,
      userPrompt: game.userPrompt,
      plan: game.gamePlan,
    });
  }

  const traffic = trafficSeedForPublish(game.slug);

  const updated = await updateGame(game, {
    status: "published",
    buildStatus: "live",
    publishedAt: nowIso(),
    coverUrl: game.coverUrl ?? coverPathForSlug(game.slug),
    coverImageBase64: coverJpeg.toString("base64"),
    kind: "generated",
    trafficTier: traffic.trafficTier,
    playCountBase: traffic.playCountBase,
    seededAt: traffic.seededAt,
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

export async function deleteGame(gameId: string, ownerUid: string): Promise<void> {
  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) return;
  assertGameOwner(game, ownerUid);
  await store.deleteGame(gameId);
  await removeWorkspace(gameId);
}

export async function getGameForOwner(
  gameId: string,
  ownerUid: string
): Promise<GameDoc> {
  const game = await getGameOrThrow(gameId);
  assertGameOwner(game, ownerUid);
  return game;
}

export async function getGameOrThrow(gameId: string): Promise<GameDoc> {
  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  return game;
}

import type { GameDoc, ChatMessage } from "../types.js";
import type { AuthUser } from "../middleware/auth.js";
import { getStore, loadFilesToWorkspace, syncWorkspaceToStore } from "./store.js";
import {
  initWorkspaceFromScaffold,
  removeWorkspace,
  workspaceDir,
} from "./workspace.js";
import { runBuildPipeline, runEditor } from "./cursor.js";
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
import { formatEditMessage, formatGameReadyMessage } from "./chat-summary.js";
import { cleanDisplayTitle, deriveLockedTitle, resolveGameTitle } from "./title.js";
import { pickPlayfieldTheme, writePlayfieldConstants } from "./playfield-theme.js";

const PIPELINE_POLL_MS = 400;
const TITLE_WAIT_MS = 2 * 60 * 1000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isPublishable(game: GameDoc): boolean {
  return (
    game.gameBuildStatus === "ready" &&
    game.coverStatus === "ready" &&
    Boolean(game.titleLocked) &&
    Boolean(game.coverImageBase64)
  );
}

async function reconcilePublishableStatus(gameId: string): Promise<void> {
  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game || game.status === "published" || game.status === "failed") {
    return;
  }
  if (isPublishable(game) && game.status !== "ready") {
    await updateGame(game, { status: "ready" });
    console.log(`Game publishable: ${gameId} (${game.slug})`);
  }
}

async function waitForLockedTitle(gameId: string): Promise<GameDoc | null> {
  const deadline = Date.now() + TITLE_WAIT_MS;
  while (Date.now() < deadline) {
    const store = await getStore();
    const game = await store.getGame(gameId);
    if (!game) return null;
    if (game.status === "failed") return null;
    if (game.titleLocked) return game;
    await sleep(PIPELINE_POLL_MS);
  }
  return null;
}

async function runTitlePipeline(gameId: string, userPrompt: string): Promise<void> {
  const store = await getStore();
  try {
    const title = await deriveLockedTitle(userPrompt);
    let game = await store.getGame(gameId);
    if (!game || game.status === "failed") return;

    game = await updateGame(game, { title, titleLocked: true });
    await reconcilePublishableStatus(gameId);
  } catch (err) {
    console.error(`Title pipeline failed for ${gameId}:`, err);
    const game = await store.getGame(gameId);
    if (!game || game.status === "failed") return;
    await updateGame(game, {
      title: cleanDisplayTitle(userPrompt),
      titleLocked: true,
    });
    await reconcilePublishableStatus(gameId);
  }
}

async function runCoverPipeline(gameId: string, userPrompt: string): Promise<void> {
  const store = await getStore();
  try {
    let game = await waitForLockedTitle(gameId);
    if (!game) {
      game = await store.getGame(gameId);
      if (!game || game.status === "failed") return;
      game = await updateGame(game, {
        title: cleanDisplayTitle(userPrompt),
        titleLocked: true,
      });
    }

    const coverJpeg = await generateCoverForCreate({
      title: game.title,
      slug: game.slug,
      userPrompt,
      skipAgentPrompt: true,
    });

    game = (await store.getGame(gameId)) ?? game;
    if (game.status === "failed") return;

    await updateGame(game, {
      coverImageBase64: coverJpeg.toString("base64"),
      coverStatus: "ready",
    });
    await reconcilePublishableStatus(gameId);
    console.log(`Cover ready: ${gameId} (${game.slug})`);
  } catch (err) {
    console.error(`Cover pipeline failed for ${gameId}:`, err);
    const game = await store.getGame(gameId);
    if (!game || game.status === "failed") return;

    try {
      const coverJpeg = await generateFallbackCoverJpeg({
        title: resolveGameTitle(game),
        slug: game.slug,
        userPrompt,
      });
      await updateGame(game, {
        coverImageBase64: coverJpeg.toString("base64"),
        coverStatus: "ready",
      });
      await reconcilePublishableStatus(gameId);
    } catch (fallbackErr) {
      console.error(`Cover fallback failed for ${gameId}:`, fallbackErr);
      await updateGame(game, { coverStatus: "failed" });
    }
  }
}

async function executeGameBuild(game: GameDoc): Promise<void> {
  const store = await getStore();
  const { id, slug, userPrompt } = game;

  try {
    const palette = await pickPlayfieldTheme(userPrompt);
    const dir = await initWorkspaceFromScaffold(id);
    await writePlayfieldConstants(dir, palette);
    console.log(`Playfield theme for ${id}: ${palette.theme}`);

    const builderResult = await runBuildPipeline(dir, slug, userPrompt);
    await syncWorkspaceToStore(store, id, dir);

    const latest = (await store.getGame(id)) ?? game;
    const title = resolveGameTitle(latest);

    await updateGame(latest, {
      agentId: builderResult.agentId,
      gamePlan: builderResult.gamePlan,
      gameBuildStatus: "ready",
    });
    await reconcilePublishableStatus(id);

    void addChat(id, {
      role: "assistant",
      type: "generation",
      text: formatGameReadyMessage(title, builderResult.gamePlan),
    });

    console.log(`Game build playable: ${id} (${slug})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    const latest = (await store.getGame(id)) ?? game;
    await updateGame(latest, {
      status: "failed",
      gameBuildStatus: "failed",
      coverStatus: latest.coverImageBase64 ? "ready" : "failed",
      errorMessage: message,
    });
    await addChat(id, { role: "assistant", type: "error", text: message });
    console.error(`Game build failed for ${id}:`, message);
  }
}

/** Creates the draft and starts build in the background (returns immediately). */
export async function startGameFromPrompt(
  userPrompt: string,
  owner: AuthUser
): Promise<GameDoc> {
  const store = await getStore();
  const slugs = await store.listSlugs();
  const baseSlug = slugify(userPrompt);
  const slug = uniqueSlug(baseSlug, slugs);
  const id = newId();
  const now = nowIso();

  const game: GameDoc = {
    id,
    slug,
    title: cleanDisplayTitle(userPrompt),
    titleLocked: false,
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

  console.log(`Game build started: ${id} (${slug})`);
  void runTitlePipeline(id, userPrompt);
  void runCoverPipeline(id, userPrompt);
  void executeGameBuild(game);

  return game;
}

export async function listMyGames(ownerUid: string): Promise<GameDoc[]> {
  const store = await getStore();
  return store.listByOwner(ownerUid);
}

async function executeGameEdit(
  game: GameDoc,
  userEdit: string,
  gamePlan: string
): Promise<void> {
  const store = await getStore();
  const gameId = game.id;

  try {
    const dir = workspaceDir(gameId);
    await loadFilesToWorkspace(store, gameId, dir);
    await runEditor(game.agentId!, dir, userEdit, gamePlan);
    await syncWorkspaceToStore(store, gameId, dir);

    const latest = (await store.getGame(gameId)) ?? game;
    await updateGame(latest, { gameBuildStatus: "ready" });
    await reconcilePublishableStatus(gameId);

    void addChat(gameId, {
      role: "assistant",
      type: "edit",
      text: formatEditMessage(userEdit),
    });

    console.log(`Game edit completed: ${gameId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    const latest = (await store.getGame(gameId)) ?? game;
    await updateGame(latest, {
      status: "failed",
      gameBuildStatus: "failed",
      errorMessage: message,
    });
    await addChat(gameId, { role: "assistant", type: "error", text: message });
    console.error(`Game edit failed for ${gameId}:`, message);
  }
}

/** Queues an edit and returns immediately while the VM applies changes in the background. */
export async function startEditGameDraft(
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
  if (game.gameBuildStatus === "building") {
    throw new Error("Game is still building — wait for the preview to load");
  }
  if (!game.agentId || !game.gamePlan) {
    throw new Error("Draft is missing agent session or plan");
  }

  await addChat(gameId, { role: "user", type: "edit", text: userEdit });
  const updated = await updateGame(game, {
    status: "generating",
    gameBuildStatus: "building",
  });

  console.log(`Game edit started: ${gameId}`);
  void executeGameEdit(updated, userEdit, game.gamePlan);

  return updated;
}

export async function publishGame(gameId: string, ownerUid: string): Promise<GameDoc> {
  requireFirestore();

  const store = await getStore();
  const game = await store.getGame(gameId);
  if (!game) throw new Error("Game not found");
  assertGameOwner(game, ownerUid);
  if (!isPublishable(game)) {
    throw new Error("Game is not ready to publish yet — wait a moment and try again");
  }
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

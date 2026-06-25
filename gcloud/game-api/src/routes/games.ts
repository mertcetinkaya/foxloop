import { Router } from "express";
import { buildCatalogResponse } from "../services/catalog-service.js";
import {
  createGameFromPrompt,
  deleteGame,
  editGameDraft,
  getGameForOwner,
  getPublishedGameBySlug,
  listMyGames,
  publishGame,
  resolveGameTitle,
} from "../services/game-service.js";
import { generateFallbackCoverJpeg } from "../services/cover-image.js";
import { getStore } from "../services/store.js";
import { buildPreviewFromGameId } from "../services/preview.js";
import { isCursorConfigured } from "../services/cursor.js";
import { sanitizeChatMessageForPlayer } from "../services/chat-summary.js";
import { requireAuth, requireInvitedUser } from "../middleware/auth.js";

export const gamesRouter = Router();

gamesRouter.get("/published", async (_req, res) => {
  try {
    const catalog = await buildCatalogResponse();
    const generated = catalog.lite.filter((g) => g.path?.startsWith("/games/"));
    res.json({ games: generated });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to list games",
    });
  }
});

gamesRouter.get("/mine", requireAuth, async (req, res) => {
  try {
    const games = await listMyGames(req.authUser!.uid);
    res.json({ games });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to list games",
    });
  }
});

gamesRouter.get("/by-slug/:slug/cover", async (req, res) => {
  try {
    const game = await getPublishedGameBySlug(req.params.slug);
    const title = resolveGameTitle(game);

    if (game.coverImageBase64) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(game.coverImageBase64, "base64"));
      return;
    }

    const jpeg = await generateFallbackCoverJpeg({
      title,
      slug: game.slug,
      userPrompt: game.userPrompt,
      plan: game.gamePlan,
    });
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(jpeg);
  } catch {
    res.status(404).send("Not found");
  }
});

gamesRouter.get("/by-slug/:slug/play", async (req, res) => {
  try {
    const game = await getPublishedGameBySlug(req.params.slug);
    const store = await getStore();
    const html = await buildPreviewFromGameId(game.id, () =>
      store.getFiles(game.id)
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch {
    res.status(404).json({ error: "Game not found" });
  }
});

gamesRouter.get("/by-slug/:slug", async (req, res) => {
  try {
    const game = await getPublishedGameBySlug(req.params.slug);
    res.json({ game });
  } catch {
    res.status(404).json({ error: "Game not found" });
  }
});

gamesRouter.post("/", requireAuth, requireInvitedUser, async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (!isCursorConfigured()) {
    res.status(503).json({ error: "CURSOR_API_KEY is not configured on the server" });
    return;
  }

  try {
    const game = await createGameFromPrompt(prompt, req.authUser!);
    res.status(201).json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    res.status(500).json({ error: message });
  }
});

gamesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const game = await getGameForOwner(req.params.id, req.authUser!.uid);
    res.json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Game not found";
    const status = message.includes("Not authorized") ? 403 : 404;
    res.status(status).json({ error: message });
  }
});

gamesRouter.get("/:id/cover", async (req, res) => {
  try {
    const store = await getStore();
    const game = await store.getGame(req.params.id);
    if (!game?.coverImageBase64) {
      res.status(404).send("Cover not ready");
      return;
    }
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(Buffer.from(game.coverImageBase64, "base64"));
  } catch {
    res.status(404).send("Not found");
  }
});

gamesRouter.get("/:id/chat", requireAuth, async (req, res) => {
  try {
    await getGameForOwner(req.params.id, req.authUser!.uid);
    const store = await getStore();
    const messages = await store.getChat(req.params.id);
    res.json({
      messages: messages.map((m) => sanitizeChatMessageForPlayer(m)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load chat";
    const status = message.includes("Not authorized") ? 403 : 404;
    res.status(status).json({ error: message });
  }
});

gamesRouter.post("/:id/edit", requireAuth, async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  try {
    const game = await editGameDraft(req.params.id, prompt, req.authUser!.uid);
    res.json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    let status = 400;
    if (message.includes("not found")) status = 404;
    if (message.includes("Not authorized")) status = 403;
    res.status(status).json({ error: message });
  }
});

gamesRouter.get("/:id/preview", async (req, res) => {
  try {
    const store = await getStore();
    const html = await buildPreviewFromGameId(req.params.id, () =>
      store.getFiles(req.params.id)
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Preview failed",
    });
  }
});

gamesRouter.post("/:id/publish", requireAuth, async (req, res) => {
  try {
    const game = await publishGame(req.params.id, req.authUser!.uid);
    res.json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    let status = 400;
    if (message.includes("not found")) status = 404;
    if (message.includes("Not authorized")) status = 403;
    res.status(status).json({ error: message });
  }
});

gamesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    await deleteGame(req.params.id, req.authUser!.uid);
    res.status(204).end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    let status = 400;
    if (message.includes("Not authorized")) status = 403;
    res.status(status).json({ error: message });
  }
});

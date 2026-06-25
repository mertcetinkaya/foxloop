import { Router } from "express";
import multer from "multer";
import type { PublishedGameCard } from "../types.js";
import {
  createGameFromPrompt,
  deleteDraft,
  editGameDraft,
  getGameOrThrow,
  getPublishedGameBySlug,
  publishGame,
  resolveGameTitle,
} from "../services/game-service.js";
import { generateCoverJpeg } from "../services/cover-ai.js";
import { getStore } from "../services/store.js";
import { buildPreviewFromGameId } from "../services/preview.js";
import { isCursorConfigured } from "../services/cursor.js";
import { sanitizeChatMessageForPlayer } from "../services/chat-summary.js";

export const gamesRouter = Router();

const referenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("referenceImage must be an image file"));
    }
  },
});

gamesRouter.get("/published", async (_req, res) => {
  try {
    const store = await getStore();
    const games = await store.listPublished();
    const cards: PublishedGameCard[] = games.map((g) => ({
      id: g.slug,
      title: resolveGameTitle(g),
      image: g.coverUrl ?? `/games/by-slug/${encodeURIComponent(g.slug)}/cover`,
      playCount: "0",
      path: `/games/${g.slug}`,
      playable: true,
      featured: false,
      buildStatus: g.buildStatus,
      publishedAt: g.publishedAt,
    }));
    res.json({ games: cards });
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

    const jpeg = await generateCoverJpeg({
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

gamesRouter.post("/", referenceUpload.single("referenceImage"), async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "referenceImage is required" });
    return;
  }
  if (!isCursorConfigured()) {
    res.status(503).json({ error: "CURSOR_API_KEY is not configured on the server" });
    return;
  }

  try {
    const game = await createGameFromPrompt(
      prompt,
      req.file.buffer,
      req.file.mimetype
    );
    res.status(201).json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    res.status(500).json({ error: message });
  }
});

gamesRouter.get("/:id", async (req, res) => {
  try {
    const game = await getGameOrThrow(req.params.id);
    res.json({ game });
  } catch {
    res.status(404).json({ error: "Game not found" });
  }
});

gamesRouter.get("/:id/cover", async (req, res) => {
  try {
    const game = await getGameOrThrow(req.params.id);
    if (game.coverImageBase64) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(Buffer.from(game.coverImageBase64, "base64"));
      return;
    }
    res.status(404).send("Cover not ready");
  } catch {
    res.status(404).send("Not found");
  }
});

gamesRouter.get("/:id/chat", async (req, res) => {
  try {
    const store = await getStore();
    const messages = await store.getChat(req.params.id);
    res.json({
      messages: messages.map((m) => sanitizeChatMessageForPlayer(m)),
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to load chat",
    });
  }
});

gamesRouter.post("/:id/edit", async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  try {
    const game = await editGameDraft(req.params.id, prompt);
    res.json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Edit failed";
    const status = message.includes("not found") ? 404 : 400;
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

gamesRouter.post("/:id/publish", async (req, res) => {
  try {
    const game = await publishGame(req.params.id);
    res.json({ game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

gamesRouter.delete("/:id", async (req, res) => {
  try {
    await deleteDraft(req.params.id);
    res.status(204).end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    res.status(400).json({ error: message });
  }
});

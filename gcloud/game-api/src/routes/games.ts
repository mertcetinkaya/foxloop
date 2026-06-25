import { Router } from "express";
import type { PublishedGameCard } from "../types.js";
import {
  createGameFromPrompt,
  deleteDraft,
  editGameDraft,
  getGameOrThrow,
  getPublishedGameBySlug,
  publishGame,
} from "../services/game-service.js";
import { getStore } from "../services/store.js";
import { buildPreviewFromGameId } from "../services/preview.js";
import { isCursorConfigured } from "../services/cursor.js";

export const gamesRouter = Router();

gamesRouter.get("/published", async (_req, res) => {
  try {
    const store = await getStore();
    const games = await store.listPublished();
    const cards: PublishedGameCard[] = games.map((g) => ({
      id: g.slug,
      title: g.title,
      image: g.coverUrl ?? `/games/${g.slug}.jpg`,
      playCount: "0",
      path: `/games/${g.slug}`,
      playable: true,
      featured: false,
      buildStatus: g.buildStatus,
    }));
    res.json({ games: cards });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to list games",
    });
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

gamesRouter.post("/", async (req, res) => {
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
    const game = await createGameFromPrompt(prompt);
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

gamesRouter.get("/:id/chat", async (req, res) => {
  try {
    const store = await getStore();
    const messages = await store.getChat(req.params.id);
    res.json({ messages });
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

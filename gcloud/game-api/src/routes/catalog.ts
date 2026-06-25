import { Router } from "express";
import { buildCatalogResponse } from "../services/catalog-service.js";
import { getCatalogGameBySlug } from "../services/catalog-store.js";
import {
  computePlayCount,
  formatPlayCount,
} from "../services/play-count.js";

export const catalogRouter = Router();

catalogRouter.get("/", async (_req, res) => {
  try {
    const catalog = await buildCatalogResponse();
    res.json(catalog);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to load catalog",
    });
  }
});

catalogRouter.get("/games/:slug", async (req, res) => {
  try {
    const doc = await getCatalogGameBySlug(req.params.slug);
    if (!doc) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    const numeric = computePlayCount(
      doc.slug,
      doc.playCountBase,
      doc.seededAt,
      doc.trafficTier
    );
    res.json({
      game: {
        id: doc.slug,
        title: doc.title,
        image: doc.image,
        playCount: formatPlayCount(numeric),
        path: doc.path ?? (doc.kind === "embed" ? `/play/${doc.slug}` : undefined),
        externalUrl: doc.externalUrl,
        embedPath: doc.embedPath ?? `/embed/${doc.slug}/index.html`,
        playable: doc.playable,
        kind: doc.kind,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to load game",
    });
  }
});

import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { gamesRouter } from "./routes/games.js";
import { authRouter } from "./routes/auth.js";
import { isCursorConfigured } from "./services/cursor.js";
import { initFirebaseAdmin } from "./services/firebase-admin.js";

initFirebaseAdmin();

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "foxloop-game-api",
    cursor: isCursorConfigured(),
    firestore: config.useFirestore,
    storage: config.useFirestore ? "firestore" : "local",
  });
});

app.use("/auth", authRouter);
app.use("/games", gamesRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

app.listen(config.port, () => {
  console.log(`foxloop-game-api listening on :${config.port}`);
});

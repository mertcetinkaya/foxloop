import { Router } from "express";
import { requireFirestore } from "../config.js";
import { loginInvitedUser } from "../services/invited-users.js";
import { recordLoginEvent, shouldSkipLoginRecording } from "../services/login-events.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/invited-login", async (req, res) => {
  try {
    requireFirestore();
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Firestore is not configured",
    });
    return;
  }

  const username = String(req.body?.username ?? "").trim();
  const password = String(req.body?.password ?? "");

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  try {
    const result = await loginInvitedUser(username, password);
    const user = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName ?? username,
    };
    if (!shouldSkipLoginRecording(req)) {
      await recordLoginEvent(user).catch((err) => {
        console.error("Failed to record invited login event:", err);
      });
    }
    res.json({
      token: result.token,
      user: {
        uid: user.uid,
        displayName: user.displayName ?? username,
        email: user.email ?? username,
        photoURL: null,
        provider: "invited",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ error: message });
  }
});

authRouter.post("/record-login", requireAuth, async (req, res) => {
  try {
    requireFirestore();
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : "Firestore is not configured",
    });
    return;
  }

  try {
    if (shouldSkipLoginRecording(req)) {
      res.status(204).end();
      return;
    }

    const event = await recordLoginEvent(req.authUser!);
    res.status(201).json({ event });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record login";
    res.status(500).json({ error: message });
  }
});

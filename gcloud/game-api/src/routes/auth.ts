import { Router } from "express";
import { requireFirestore } from "../config.js";
import { loginInvitedUser } from "../services/invited-users.js";

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
    res.json({
      token: result.token,
      user: {
        uid: result.user.uid,
        displayName: result.user.displayName ?? username,
        email: result.user.email ?? username,
        photoURL: null,
        provider: "invited",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ error: message });
  }
});

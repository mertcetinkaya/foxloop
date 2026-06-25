import type { NextFunction, Request, Response } from "express";
import { verifyFirebaseToken } from "../services/firebase-admin.js";
import { verifyInvitedToken } from "../services/invited-users.js";

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
}

function parseBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = parseBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = await verifyFirebaseToken(token);
    req.authUser = {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name ?? decoded.email,
    };
    next();
    return;
  } catch {
    // try invited JWT
  }

  try {
    const invited = verifyInvitedToken(token);
    req.authUser = {
      uid: invited.uid,
      email: invited.email,
      displayName: invited.displayName,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

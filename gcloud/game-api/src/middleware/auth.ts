import type { NextFunction, Request, Response } from "express";
import { verifyFirebaseToken } from "../services/firebase-admin.js";

export interface AuthUser {
  uid: string;
  email?: string;
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
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

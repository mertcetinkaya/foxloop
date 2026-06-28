import { Firestore } from "@google-cloud/firestore";
import { config, requireFirestore } from "../config.js";
import { isInvitedUser, type AuthUser } from "../middleware/auth.js";

const COLLECTION = "loginEvents";

export type LoginProvider = "google" | "invited";

export interface LoginEventDoc {
  uid: string;
  username: string;
  provider: LoginProvider;
  loggedInAt: string;
}

function getFirestore(): Firestore {
  return new Firestore({ projectId: config.gcpProject });
}

function providerForUid(uid: string): LoginProvider {
  return isInvitedUser(uid) ? "invited" : "google";
}

function usernameForUser(user: AuthUser): string {
  if (isInvitedUser(user.uid)) {
    return (user.email ?? user.uid.replace(/^invited:/, "")).toLowerCase();
  }
  const email = user.email?.trim();
  if (!email) {
    throw new Error("Google login is missing an email address");
  }
  return email.toLowerCase();
}

const LOCAL_DEV_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

type HeaderReader = { get(name: string): string | undefined };

function requestOrigin(req: HeaderReader): string | null {
  const origin = req.get("origin");
  if (origin) return origin;
  const referer = req.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/** Skip Firestore loginEvents for local dev UI or explicit client/server opt-out. */
export function shouldSkipLoginRecording(req: HeaderReader): boolean {
  if (config.skipLoginEvents) return true;
  if (req.get("x-skip-login-events") === "1") return true;
  const origin = requestOrigin(req);
  return origin !== null && LOCAL_DEV_ORIGINS.has(origin);
}

/** Append one login row — each successful sign-in creates a new document. */
export async function recordLoginEvent(user: AuthUser): Promise<LoginEventDoc | null> {
  requireFirestore();

  const event: LoginEventDoc = {
    uid: user.uid,
    username: usernameForUser(user),
    provider: providerForUid(user.uid),
    loggedInAt: new Date().toISOString(),
  };

  const db = getFirestore();
  await db.collection(COLLECTION).add(event);
  return event;
}

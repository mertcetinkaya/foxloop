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

/** Append one login row — each successful sign-in creates a new document. */
export async function recordLoginEvent(user: AuthUser): Promise<LoginEventDoc> {
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

import jwt from "jsonwebtoken";
import { Firestore } from "@google-cloud/firestore";
import { config } from "../config.js";

const COLLECTION = "invitedUsers";
const INVITED_UID_PREFIX = "invited:";
const JWT_EXPIRY = "30d";

/** Plain-text password in Firestore — add manually in Firebase Console. */
export interface InvitedUserDoc {
  username?: string;
  password: string;
  enabled?: boolean;
  displayName?: string;
}

export interface InvitedAuthUser {
  uid: string;
  email?: string;
  displayName?: string;
}

function invitedUid(username: string): string {
  return `${INVITED_UID_PREFIX}${username.toLowerCase()}`;
}

function getFirestore(): Firestore {
  return new Firestore({ projectId: config.gcpProject });
}

function passwordMatches(doc: InvitedUserDoc, password: string): boolean {
  return doc.password === password;
}

export async function createInvitedUser(
  username: string,
  password: string,
  displayName?: string
): Promise<void> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) throw new Error("username is required");
  if (!password) throw new Error("password is required");

  const db = getFirestore();
  const doc: InvitedUserDoc = {
    username: normalized,
    password,
    enabled: true,
    displayName: displayName ?? normalized,
  };
  await db.collection(COLLECTION).doc(normalized).set(doc, { merge: true });
}

export async function loginInvitedUser(
  username: string,
  password: string
): Promise<{ token: string; user: InvitedAuthUser }> {
  const normalized = username.trim().toLowerCase();
  if (!normalized || !password) {
    throw new Error("Invalid username or password");
  }

  const db = getFirestore();
  const snap = await db.collection(COLLECTION).doc(normalized).get();
  if (!snap.exists) {
    throw new Error("Invalid username or password");
  }

  const data = snap.data() as InvitedUserDoc;
  if (data.enabled === false) {
    throw new Error("This account is disabled");
  }

  if (!data.password || !passwordMatches(data, password)) {
    throw new Error("Invalid username or password");
  }

  const uid = invitedUid(normalized);
  const token = jwt.sign(
    { uid, username: normalized, type: "invited" },
    config.invitedJwtSecret,
    { expiresIn: JWT_EXPIRY, subject: uid }
  );

  return {
    token,
    user: {
      uid,
      email: normalized,
      displayName: data.displayName ?? normalized,
    },
  };
}

export function verifyInvitedToken(token: string): InvitedAuthUser {
  const payload = jwt.verify(token, config.invitedJwtSecret) as {
    uid?: string;
    username?: string;
    type?: string;
  };

  if (payload.type !== "invited" || !payload.uid?.startsWith(INVITED_UID_PREFIX)) {
    throw new Error("Invalid invited token");
  }

  return {
    uid: payload.uid,
    email: payload.username,
    displayName: payload.username,
  };
}

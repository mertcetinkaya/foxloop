import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Firestore } from "@google-cloud/firestore";
import { config } from "../config.js";

const COLLECTION = "invitedUsers";
const INVITED_UID_PREFIX = "invited:";
const JWT_EXPIRY = "30d";

export interface InvitedUserDoc {
  username: string;
  passwordHash: string;
  enabled: boolean;
  displayName?: string;
  createdAt: string;
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

export async function hashInvitedPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function createInvitedUser(
  username: string,
  password: string,
  displayName?: string
): Promise<void> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) throw new Error("username is required");

  const db = getFirestore();
  const passwordHash = await hashInvitedPassword(password);
  const doc: InvitedUserDoc = {
    username: normalized,
    passwordHash,
    enabled: true,
    displayName: displayName ?? normalized,
    createdAt: new Date().toISOString(),
  };
  await db.collection(COLLECTION).doc(normalized).set(doc);
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
  if (!data.enabled) {
    throw new Error("This account is disabled");
  }

  const ok = await bcrypt.compare(password, data.passwordHash);
  if (!ok) {
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

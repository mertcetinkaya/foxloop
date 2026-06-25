import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { config } from "../config.js";

let initialized = false;

export function initFirebaseAdmin(): void {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: config.gcpProject,
  });
  initialized = true;
}

export async function verifyFirebaseToken(token: string): Promise<DecodedIdToken> {
  initFirebaseAdmin();
  return getAuth().verifyIdToken(token);
}

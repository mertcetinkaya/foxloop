/** When true, page/login analytics and Firestore login recording are skipped (local dev). */
export function isRemoteTelemetryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_REMOTE_TELEMETRY !== "true";
}

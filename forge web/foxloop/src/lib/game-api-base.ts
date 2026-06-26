/** Browser-facing path on production (same-origin HTTPS proxy). */
export const GAME_API_PROXY_PATH = "/api/game";

/** VM/direct URL for server-side fetch and Netlify rewrite target. */
export function gameApiInternalBase(): string {
  return (
    process.env.GAME_API_INTERNAL_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_GAME_API_URL?.replace(/\/$/, "") ??
    "http://localhost:8001"
  );
}

/**
 * Base URL for browser-originated game-api requests (always same-origin proxy).
 * Server-side code should use gameApiInternalBase() for direct VM fetch.
 */
export function getGameApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_GAME_API_URL?.replace(/\/$/, "");
  if (configured?.startsWith("/")) return configured;
  return GAME_API_PROXY_PATH;
}

/** True when running in the browser (client components, login, etc.). */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function resolveGameApiBase(): string {
  return isBrowser() ? getGameApiBase() : gameApiInternalBase();
}

/** Same-origin proxy path for a game-api resource (covers, play, etc.). */
export function proxiedGameApiPath(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${GAME_API_PROXY_PATH}${path}`;
}

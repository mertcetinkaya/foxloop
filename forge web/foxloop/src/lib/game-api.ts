import type { Game } from "@/data/games";
import type { AppUser } from "@/lib/auth-types";
import { getAuthIdToken } from "@/lib/auth-token";
import {
  proxiedGameApiPath,
  resolveGameApiBase,
} from "@/lib/game-api-base";

export function gameApiUrl(path: string): string {
  const base = resolveGameApiBase();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export type GameStatus =
  | "draft"
  | "planning"
  | "generating"
  | "ready"
  | "published"
  | "failed";

export type PipelineStatus =
  | "pending"
  | "building"
  | "generating"
  | "ready"
  | "failed";

export interface ApiGame {
  id: string;
  slug: string;
  title: string;
  status: GameStatus;
  userPrompt: string;
  gamePlan?: string;
  coverUrl?: string;
  buildStatus?: "pending" | "building" | "live" | "failed";
  titleLocked?: boolean;
  coverLocked?: boolean;
  gameBuildStatus?: PipelineStatus;
  coverStatus?: PipelineStatus;
  errorMessage?: string;
  playCount?: string;
  featured?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  type: string;
  text: string;
  createdAt: string;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Request failed (${res.status})`
    );
  }
  return data as T;
}

async function authHeaders(json = false): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  const token = await getAuthIdToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function gameApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(gameApiUrl("/health"));
    return res.ok;
  } catch {
    return false;
  }
}

export async function loginInvited(
  username: string,
  password: string
): Promise<{ token: string; user: AppUser }> {
  const res = await fetch(gameApiUrl("/auth/invited-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parseJson<{ token: string; user: AppUser }>(res);
}

/** Records a Google sign-in in Firestore (invited logins are recorded server-side). */
export async function recordLogin(): Promise<void> {
  try {
    const res = await fetch(gameApiUrl("/auth/record-login"), {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) return;
  } catch {
    // Non-blocking — sign-in already succeeded.
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Cancelled", "AbortError"));
      },
      { once: true }
    );
  });
}

function isTerminalGameStatus(status: GameStatus): boolean {
  return status === "ready" || status === "failed" || status === "published";
}

/** Poll until build/edit finishes (avoids Netlify proxy timeout on long POST). */
export async function waitForGameReady(
  id: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    onUpdate?: (game: ApiGame) => void | Promise<void>;
  }
): Promise<ApiGame> {
  const intervalMs = options?.intervalMs ?? 2500;
  const timeoutMs = options?.timeoutMs ?? 20 * 60 * 1000;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    if (options?.signal?.aborted) {
      throw new DOMException("Cancelled", "AbortError");
    }

    const game = await fetchGame(id);
    await options?.onUpdate?.(game);

    if (isTerminalGameStatus(game.status)) {
      return game;
    }

    if (Date.now() >= deadline) {
      throw new Error("Generation timed out — check My Games in a few minutes");
    }

    await sleep(intervalMs, options?.signal);
  }
}

export async function createGame(prompt: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl("/games"), {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ prompt }),
  });
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function fetchMyGames(): Promise<ApiGame[]> {
  const res = await fetch(gameApiUrl("/games/mine"), {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ games: ApiGame[] }>(res);
  return data.games;
}

export async function fetchGame(id: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl(`/games/${id}`), {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function fetchChat(id: string): Promise<ChatMessage[]> {
  const res = await fetch(gameApiUrl(`/games/${id}/chat`), {
    headers: await authHeaders(),
  });
  const data = await parseJson<{ messages: ChatMessage[] }>(res);
  return data.messages;
}

export async function editGame(id: string, prompt: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl(`/games/${id}/edit`), {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify({ prompt }),
  });
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function publishGame(id: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl(`/games/${id}/publish`), {
    method: "POST",
    headers: await authHeaders(),
  });
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function deleteGame(id: string): Promise<void> {
  const res = await fetch(gameApiUrl(`/games/${id}`), {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    await parseJson(res);
  }
}

export function previewUrl(id: string): string {
  return gameApiUrl(`/games/${id}/preview`);
}

export function draftCoverUrl(id: string): string {
  return gameApiUrl(`/games/${id}/cover`);
}

/** Rough client-side title preview while the server locks the real title. */
export function previewTitleFromPrompt(prompt: string): string {
  let t = prompt.trim().replace(/^["'`]|["'`]$/g, "");
  if (t.includes(":")) t = t.split(":")[0]?.trim() ?? t;
  const words = t.split(/\s+/).filter(Boolean).slice(0, 4);
  t = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return t || "Your Game";
}

export function playUrlBySlug(slug: string): string {
  return gameApiUrl(`/games/by-slug/${encodeURIComponent(slug)}/play`);
}

function withPublishedVersion(url: string, publishedAt?: string): string {
  if (!publishedAt) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(publishedAt)}`;
}

export function publishedCoverUrl(
  slug: string,
  image?: string,
  publishedAt?: string
): string {
  if (image?.startsWith("http://") || image?.startsWith("https://")) {
    try {
      const parsed = new URL(image);
      if (parsed.pathname.startsWith("/games/")) {
        return withPublishedVersion(
          proxiedGameApiPath(`${parsed.pathname}${parsed.search}`),
          publishedAt
        );
      }
    } catch {
      /* external URL */
    }
    return withPublishedVersion(image, publishedAt);
  }

  const path = image?.startsWith("/games/by-slug/")
    ? image
    : `/games/by-slug/${encodeURIComponent(slug)}/cover`;

  return withPublishedVersion(proxiedGameApiPath(path), publishedAt);
}

export async function fetchCatalog(): Promise<import("@/lib/catalog").CatalogResponse> {
  const { fetchCatalogFromApi } = await import("@/lib/catalog-fetch");
  const live = await fetchCatalogFromApi();
  if (live) return live;
  const { staticCatalogFallback } = await import("@/lib/catalog");
  return staticCatalogFallback();
}

export async function fetchPublishedGames(): Promise<Game[]> {
  const catalog = await fetchCatalog();
  return catalog.lite.filter((g) => g.path?.startsWith("/games/") && !g.path.includes("/play/"));
}

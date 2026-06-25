import type { Game } from "@/data/games";

const BASE =
  process.env.NEXT_PUBLIC_GAME_API_URL ?? "http://localhost:8001";

export function gameApiUrl(path: string): string {
  return `${BASE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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

export async function gameApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(gameApiUrl("/health"));
    return res.ok;
  } catch {
    return false;
  }
}

export async function createGame(prompt: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl("/games"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function fetchGame(id: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl(`/games/${id}`));
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function fetchChat(id: string): Promise<ChatMessage[]> {
  const res = await fetch(gameApiUrl(`/games/${id}/chat`));
  const data = await parseJson<{ messages: ChatMessage[] }>(res);
  return data.messages;
}

export async function editGame(id: string, prompt: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl(`/games/${id}/edit`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function publishGame(id: string): Promise<ApiGame> {
  const res = await fetch(gameApiUrl(`/games/${id}/publish`), {
    method: "POST",
  });
  const data = await parseJson<{ game: ApiGame }>(res);
  return data.game;
}

export async function deleteDraft(id: string): Promise<void> {
  const res = await fetch(gameApiUrl(`/games/${id}`), { method: "DELETE" });
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

export function publishedCoverUrl(
  slug: string,
  image?: string,
  publishedAt?: string
): string {
  let url: string;
  if (image?.startsWith("http://") || image?.startsWith("https://")) {
    url = image;
  } else if (image?.startsWith("/games/by-slug/")) {
    url = gameApiUrl(image);
  } else {
    url = gameApiUrl(`/games/by-slug/${encodeURIComponent(slug)}/cover`);
  }
  if (publishedAt) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(publishedAt)}`;
  }
  return url;
}

export async function fetchPublishedGames(): Promise<Game[]> {
  const res = await fetch(gameApiUrl("/games/published"));
  const data = await parseJson<{ games: Game[] }>(res);
  return data.games.map((game) => ({
    ...game,
    image: publishedCoverUrl(
      game.id,
      game.image,
      (game as Game & { publishedAt?: string }).publishedAt
    ),
  }));
}

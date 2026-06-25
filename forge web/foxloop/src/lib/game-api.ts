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

export interface ApiGame {
  id: string;
  slug: string;
  title: string;
  status: GameStatus;
  userPrompt: string;
  gamePlan?: string;
  coverUrl?: string;
  buildStatus?: "pending" | "building" | "live" | "failed";
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

export async function fetchPublishedGames(): Promise<Game[]> {
  const res = await fetch(gameApiUrl("/games/published"));
  const data = await parseJson<{ games: Game[] }>(res);
  return data.games;
}

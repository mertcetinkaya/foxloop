export type GameStatus =
  | "draft"
  | "planning"
  | "generating"
  | "ready"
  | "published"
  | "failed";

export type BuildStatus = "pending" | "building" | "live" | "failed";

export type PipelineStatus = "pending" | "building" | "generating" | "ready" | "failed";

export type ChatRole = "user" | "assistant" | "system";

export type ChatType =
  | "prompt"
  | "plan"
  | "generation"
  | "edit"
  | "status"
  | "error";

export interface GameDoc {
  id: string;
  slug: string;
  title: string;
  status: GameStatus;
  agentId?: string;
  userPrompt: string;
  gamePlan?: string;
  coverUrl?: string;
  coverImageBase64?: string;
  buildStatus?: BuildStatus;
  titleLocked?: boolean;
  coverLocked?: boolean;
  gameBuildStatus?: PipelineStatus;
  coverStatus?: PipelineStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  publishedAt?: string;
}

export interface GameFile {
  path: string;
  content: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  type: ChatType;
  text: string;
  createdAt: string;
}

export interface PublishedGameCard {
  id: string;
  title: string;
  image: string;
  playCount: string;
  path: string;
  playable: boolean;
  featured?: boolean;
  buildStatus?: BuildStatus;
  publishedAt?: string;
}

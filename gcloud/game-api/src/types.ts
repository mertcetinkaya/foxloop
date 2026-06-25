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

export type CatalogKind = "embed" | "native" | "external" | "generated";

export type TrafficTier = 1 | 2 | 3 | "wrath";

export interface GameDoc {
  id: string;
  slug: string;
  title: string;
  status: GameStatus;
  ownerUid?: string;
  ownerEmail?: string;
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
  kind?: CatalogKind;
  trafficTier?: TrafficTier;
  playCountBase?: number;
  seededAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  publishedAt?: string;
}

export interface CatalogGameDoc {
  slug: string;
  title: string;
  kind: CatalogKind;
  image: string;
  path?: string;
  externalUrl?: string;
  embedPath?: string;
  playable: boolean;
  trafficTier: TrafficTier;
  playCountBase: number;
  seededAt: string;
  source?: string;
  license?: string;
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
  path?: string;
  externalUrl?: string;
  playable: boolean;
  featured?: boolean;
  buildStatus?: BuildStatus;
  publishedAt?: string;
}

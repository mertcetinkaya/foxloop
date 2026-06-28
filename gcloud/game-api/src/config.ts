import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

export const config = {
  port: Number(process.env.PORT ?? 8001),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),
  cursorApiKey: process.env.CURSOR_API_KEY ?? "",
  cursorModel: process.env.CURSOR_MODEL ?? "composer-2.5",
  /** When true and model is claude-opus-4-8, use thinking + high effort params. */
  cursorOpusThinkingHigh: process.env.CURSOR_OPUS_THINKING_HIGH !== "false",
  /** Optional JSON array, e.g. [{"id":"thinking","value":"true"},{"id":"effort","value":"high"}] */
  cursorModelParams: parseCursorModelParams(process.env.CURSOR_MODEL_PARAMS),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  /** Cheapest default: gpt-image-1-mini + low quality + 1024x1024 */
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1-mini",
  openaiImageQuality: process.env.OPENAI_IMAGE_QUALITY ?? "low",
  openaiImageSize: process.env.OPENAI_IMAGE_SIZE ?? "1024x1024",
  gcpProject: process.env.GOOGLE_CLOUD_PROJECT ?? "",
  useFirestore: Boolean(process.env.GOOGLE_CLOUD_PROJECT),
  githubToken: process.env.GITHUB_TOKEN ?? "",
  githubRepo: process.env.GITHUB_REPO ?? "mertcetinkaya/foxloop",
  githubBranch: process.env.GITHUB_BRANCH ?? "main",
  repoRoot:
    process.env.REPO_ROOT ??
    path.resolve(__dirname, "../../.."),
  webRoot:
    process.env.FOXLOOP_WEB_ROOT ??
    path.resolve(__dirname, "../../../forge web/foxloop"),
  workspaceRoot:
    process.env.WORKSPACE_ROOT ??
    path.resolve(__dirname, "../.workspaces"),
  dataRoot:
    process.env.DATA_ROOT ?? path.resolve(__dirname, "../.data"),
  draftTtlHours: Number(process.env.DRAFT_TTL_HOURS ?? 24),
  invitedJwtSecret:
    process.env.INVITED_JWT_SECRET ?? "foxloop-dev-invited-secret-change-me",
  /** Local dev: skip Firestore loginEvents without disabling game saves. */
  skipLoginEvents: process.env.SKIP_LOGIN_EVENTS === "true",
};

function parseCursorModelParams(
  raw: string | undefined
): Array<{ id: string; value: string }> {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is { id: string; value: string } =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as { id?: unknown }).id === "string" &&
        typeof (p as { value?: unknown }).value === "string"
    );
  } catch {
    return [];
  }
}

/** True when OPENAI_API_KEY is set — enables OpenAI cover generation on create. */
export function isAiCoverEnabled(): boolean {
  return Boolean(config.openaiApiKey.trim());
}

export function requireCursorKey(): string {
  if (!config.cursorApiKey) {
    throw new Error("CURSOR_API_KEY is not configured");
  }
  return config.cursorApiKey;
}

export function requireFirestore(): void {
  if (!config.useFirestore) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT must be set so games save to the shared Firestore database"
    );
  }
}

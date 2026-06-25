import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 8001),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim()),
  cursorApiKey: process.env.CURSOR_API_KEY ?? "",
  cursorModel: process.env.CURSOR_MODEL ?? "composer-2.5",
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
};

export function requireCursorKey(): string {
  if (!config.cursorApiKey) {
    throw new Error("CURSOR_API_KEY is not configured");
  }
  return config.cursorApiKey;
}

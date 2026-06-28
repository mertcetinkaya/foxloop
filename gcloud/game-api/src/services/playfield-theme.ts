import fs from "fs/promises";
import path from "path";
import { Agent } from "@cursor/sdk";
import { config, requireCursorKey } from "../config.js";
import { cursorModelSelection } from "./cursor-model.js";

export type PlayfieldThemeId =
  | "green"
  | "red"
  | "brown"
  | "blue"
  | "purple"
  | "neutral";

export interface PlayfieldPalette {
  theme: PlayfieldThemeId;
  field: string;
  fieldBorder: string;
  fieldLine: string;
}

const THEME_REGEX = /^(green|red|brown|blue|purple|neutral)$/;

const PALETTES: Record<PlayfieldThemeId, Omit<PlayfieldPalette, "theme">> = {
  green: {
    field: "#1a5234",
    fieldBorder: "#2a6b45",
    fieldLine: "rgba(255,255,255,0.06)",
  },
  red: {
    field: "#4a1a1f",
    fieldBorder: "#6b2a32",
    fieldLine: "rgba(255,255,255,0.06)",
  },
  brown: {
    field: "#4a3828",
    fieldBorder: "#6b5240",
    fieldLine: "rgba(255,255,255,0.06)",
  },
  blue: {
    field: "#1a2847",
    fieldBorder: "#2a3d66",
    fieldLine: "rgba(255,255,255,0.06)",
  },
  purple: {
    field: "#2a1848",
    fieldBorder: "#3d2560",
    fieldLine: "rgba(255,255,255,0.06)",
  },
  neutral: {
    field: "#1e293b",
    fieldBorder: "#334155",
    fieldLine: "rgba(255,255,255,0.06)",
  },
};

export const DEFAULT_PLAYFIELD_THEME: PlayfieldThemeId = "neutral";

export function paletteForTheme(theme: PlayfieldThemeId): PlayfieldPalette {
  const colors = PALETTES[theme];
  return { theme, ...colors };
}

export function parsePlayfieldThemeId(raw: string): PlayfieldThemeId | null {
  const token = raw.trim().toLowerCase();
  return THEME_REGEX.test(token) ? (token as PlayfieldThemeId) : null;
}

/** One-shot Agent.prompt — not stored in game chat or build agent memory. */
export async function pickPlayfieldTheme(userPrompt: string): Promise<PlayfieldPalette> {
  if (!config.cursorApiKey) {
    return paletteForTheme(DEFAULT_PLAYFIELD_THEME);
  }

  try {
    const result = await Agent.prompt(
      [
        "Pick ONE playfield background theme for a hypercasual browser game.",
        "The playfield uses a single color family only (field + border + subtle lines).",
        "Output ONLY one word from this list — no quotes, no markdown, no explanation:",
        "green, red, brown, blue, purple, neutral",
        "",
        `Game idea: ${userPrompt.trim().slice(0, 400)}`,
      ].join("\n"),
      {
        apiKey: requireCursorKey(),
        model: cursorModelSelection(),
        local: { cwd: config.webRoot, settingSources: [] },
      }
    );

    const theme = parsePlayfieldThemeId(result.result?.trim() ?? "");
    if (theme) {
      return paletteForTheme(theme);
    }
  } catch (err) {
    console.error("Playfield theme pick failed, using default:", err);
  }

  return paletteForTheme(DEFAULT_PLAYFIELD_THEME);
}

export async function writePlayfieldConstants(
  workspaceDir: string,
  palette: PlayfieldPalette
): Promise<void> {
  const content = `/** Server-set playfield theme (${palette.theme}) — do not edit */
export const FIELD = "${palette.field}";
export const FIELD_BORDER = "${palette.fieldBorder}";
export const FIELD_LINE = "${palette.fieldLine}";

export const WALL = "rgba(0,0,0,0.28)";
export const WALL_STROKE = "rgba(255,255,255,0.12)";

export const ACCENT = "#fbbf24";
export const TEXT = "#f8fafc";
export const TEXT_MUTED = "rgba(248,250,252,0.72)";
export const PILL_BG = "rgba(15,23,42,0.78)";
`;

  await fs.writeFile(path.join(workspaceDir, "constants.ts"), content, "utf8");
}

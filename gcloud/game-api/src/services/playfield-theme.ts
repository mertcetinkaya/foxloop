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
  | "black"
  | "white";

export const PLAYFIELD_THEME_IDS: PlayfieldThemeId[] = [
  "green",
  "red",
  "brown",
  "blue",
  "purple",
  "black",
  "white",
];

export interface PlayfieldPalette {
  theme: PlayfieldThemeId;
  field: string;
  fieldBorder: string;
  fieldLine: string;
}

const THEME_REGEX = /^(green|red|brown|blue|purple|black|white)$/;

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
  black: {
    field: "#0c0c0e",
    fieldBorder: "#1f1f23",
    fieldLine: "rgba(255,255,255,0.06)",
  },
  white: {
    field: "#f4f4f5",
    fieldBorder: "#d4d4d8",
    fieldLine: "rgba(0,0,0,0.06)",
  },
};

/** Fallback when LLM/parse/API fails — same green as scaffold compile stub. */
export const DEFAULT_PLAYFIELD_THEME: PlayfieldThemeId = "green";

export function paletteForTheme(theme: PlayfieldThemeId): PlayfieldPalette {
  const colors = PALETTES[theme];
  return { theme, ...colors };
}

export function parsePlayfieldThemeId(raw: string): PlayfieldThemeId | null {
  const token = raw.trim().toLowerCase().split(/\s+/)[0]?.replace(/[^a-z]/g, "") ?? "";
  return THEME_REGEX.test(token) ? (token as PlayfieldThemeId) : null;
}

function uiColorsForTheme(theme: PlayfieldThemeId): {
  text: string;
  textMuted: string;
  pillBg: string;
} {
  if (theme === "white") {
    return {
      text: "#0f172a",
      textMuted: "rgba(15,23,42,0.72)",
      pillBg: "rgba(255,255,255,0.88)",
    };
  }
  return {
    text: "#f8fafc",
    textMuted: "rgba(248,250,252,0.72)",
    pillBg: "rgba(15,23,42,0.78)",
  };
}

const THEME_PROMPT_LIST = PLAYFIELD_THEME_IDS.join(", ");

/** One-shot Agent.prompt — not stored in game chat or build agent memory. */
export async function pickPlayfieldTheme(userPrompt: string): Promise<PlayfieldPalette> {
  if (!config.cursorApiKey) {
    console.warn("Playfield theme: no API key, using green default");
    return paletteForTheme(DEFAULT_PLAYFIELD_THEME);
  }

  try {
    const result = await Agent.prompt(
      [
        "Pick ONE playfield background theme for a hypercasual browser game.",
        "The playfield uses a single color family only (field + border + subtle lines).",
        "You MUST pick exactly one word from this list — no quotes, no markdown, no explanation:",
        THEME_PROMPT_LIST,
        "Hints: desert/sand/dirt → brown; lava/fire → red; space/night → black; clean/minimal → white; water/sky → blue.",
        "",
        `Game idea: ${userPrompt.trim().slice(0, 400)}`,
      ].join("\n"),
      {
        apiKey: requireCursorKey(),
        model: cursorModelSelection(),
        local: { cwd: config.webRoot, settingSources: [] },
      }
    );

    const raw = result.result?.trim() ?? "";
    const theme = parsePlayfieldThemeId(raw);
    if (theme) {
      return paletteForTheme(theme);
    }
    console.warn(
      `Playfield theme parse failed (raw: ${JSON.stringify(raw)}), using green default`
    );
  } catch (err) {
    console.error("Playfield theme pick failed, using green default:", err);
  }

  return paletteForTheme(DEFAULT_PLAYFIELD_THEME);
}

export async function writePlayfieldConstants(
  workspaceDir: string,
  palette: PlayfieldPalette
): Promise<void> {
  const ui = uiColorsForTheme(palette.theme);
  const content = `/** Server-set playfield theme (${palette.theme}) — do not edit */
export const FIELD = "${palette.field}";
export const FIELD_BORDER = "${palette.fieldBorder}";
export const FIELD_LINE = "${palette.fieldLine}";

export const WALL = "rgba(0,0,0,0.28)";
export const WALL_STROKE = "rgba(255,255,255,0.12)";

export const ACCENT = "#fbbf24";
export const TEXT = "${ui.text}";
export const TEXT_MUTED = "${ui.textMuted}";
export const PILL_BG = "${ui.pillBg}";
`;

  await fs.writeFile(path.join(workspaceDir, "constants.ts"), content, "utf8");
}

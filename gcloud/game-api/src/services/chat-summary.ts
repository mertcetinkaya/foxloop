import { Agent } from "@cursor/sdk";
import { config, requireCursorKey } from "../config.js";
import { cursorModelSelection } from "./cursor-model.js";

function extractSection(plan: string, section: string): string {
  const re = new RegExp(`^##\\s*${section}\\s*\\n+([^#]+)`, "im");
  const match = plan.match(re);
  return match?.[1]?.trim().replace(/\n+/g, " ") ?? "";
}

function stripFilePlan(plan: string): string {
  return plan.replace(/^##\s*File Plan[\s\S]*/im, "").trim();
}

export function looksLikeCodeOrTechnical(text: string): boolean {
  if (!text.trim()) return false;
  return (
    /```/.test(text) ||
    /\b(engine|renderer|constants)\.ts\b/i.test(text) ||
    /\bimport\s+[\w{]/.test(text) ||
    /\bexport\s+function\b/.test(text) ||
    /^##\s+\w+/m.test(text) ||
    text.length > 600 && /[{;]\s*$/m.test(text)
  );
}

function templateGameReady(title: string, plan: string): string {
  const genre = extractSection(plan, "Genre");
  const loop = extractSection(plan, "Core Loop");
  const controls = extractSection(plan, "Controls");
  const visual = extractSection(plan, "Visual Style");

  const parts = [
    `I built ${title} for you!`,
    genre || loop
      ? `It's a ${genre || "hypercasual"} game${loop ? ` — ${loop.split(".")[0]}` : ""}.`
      : "It's a quick one-screen arcade game you can play right now.",
    controls
      ? `You'll play by ${controls.split(".")[0].toLowerCase()}.`
      : "Use your finger or mouse to control it.",
    visual
      ? `Visually I went for ${visual.split(".")[0].toLowerCase()}.`
      : "I polished the look with gradients, glow, and a bit of depth.",
    "Try it in the preview — tell me if you want anything changed before you publish!",
  ];

  return parts.join(" ");
}

function templateEditSummary(userEdit: string): string {
  const short = userEdit.trim().slice(0, 120);
  return `Done! I updated the game based on your note: "${short}${userEdit.length > 120 ? "…" : ""}". Give the preview another spin and let me know if you want more tweaks.`;
}

export async function summarizeGameReady(
  title: string,
  userPrompt: string,
  plan: string
): Promise<string> {
  const fallback = templateGameReady(title, plan);
  if (!config.cursorApiKey) return fallback;

  const designNotes = stripFilePlan(plan).slice(0, 900);

  try {
    const result = await Agent.prompt(
      [
        "You are a friendly mobile game studio assistant (Forge Lite). The player NEVER sees code or technical specs.",
        "The game is built and playable in the preview panel.",
        "",
        "Write 3–5 short conversational sentences as if you personally made the game.",
        "Mention: the title, what kind of game it is, how to play (controls), and one visual or mood detail.",
        "Use plain text only — no markdown, no bullet lists, no code, no file names, no TypeScript.",
        "",
        `Title: ${title}`,
        `Player's original idea: ${userPrompt.trim().slice(0, 300)}`,
        designNotes ? `Internal design notes (do not quote verbatim):\n${designNotes}` : "",
      ].join("\n"),
      {
        apiKey: requireCursorKey(),
        model: cursorModelSelection(),
        local: { cwd: config.webRoot, settingSources: [] },
      }
    );

    const text = result.result?.trim();
    if (text && text.length > 20 && !looksLikeCodeOrTechnical(text)) {
      return text.slice(0, 1200);
    }
  } catch {
    // fallback
  }

  return fallback;
}

export async function summarizeEdit(
  userEdit: string,
  title: string,
  plan?: string
): Promise<string> {
  const fallback = templateEditSummary(userEdit);
  if (!config.cursorApiKey) return fallback;

  const planHint = plan ? stripFilePlan(plan).slice(0, 400) : "";

  try {
    const result = await Agent.prompt(
      [
        "You are a friendly game studio assistant. The player asked for a change to their game draft.",
        "Confirm the update in 2–3 warm, simple sentences. Explain what changed in plain language.",
        "Never mention code, files, TypeScript, or implementation details.",
        "No markdown, no bullet lists.",
        "",
        `Game title: ${title}`,
        `Player's change request: ${userEdit.trim().slice(0, 400)}`,
        planHint ? `Game context:\n${planHint}` : "",
      ].join("\n"),
      {
        apiKey: requireCursorKey(),
        model: cursorModelSelection(),
        local: { cwd: config.webRoot, settingSources: [] },
      }
    );

    const text = result.result?.trim();
    if (text && text.length > 10 && !looksLikeCodeOrTechnical(text)) {
      return text.slice(0, 800);
    }
  } catch {
    // fallback
  }

  return fallback;
}

/** Scrub legacy chat entries that exposed plans or agent code dumps. */
export function sanitizeChatMessageForPlayer(
  msg: { role: string; type: string; text: string }
): { role: string; type: string; text: string } {
  if (msg.role !== "assistant") return msg;

  if (msg.type === "plan" || msg.type === "generation" || msg.type === "edit") {
    if (looksLikeCodeOrTechnical(msg.text) || msg.type === "plan") {
      if (msg.type === "edit" && !looksLikeCodeOrTechnical(msg.text)) {
        return msg;
      }
      if (msg.type === "generation" && !looksLikeCodeOrTechnical(msg.text) && !/^##\s/m.test(msg.text)) {
        return msg;
      }
      const generic =
        msg.type === "edit"
          ? "I updated your game — try the preview again!"
          : "Your game is ready in the preview! Play it on the left and tell me if you'd like any changes.";
      return { ...msg, type: msg.type === "plan" ? "generation" : msg.type, text: generic };
    }
  }

  return msg;
}

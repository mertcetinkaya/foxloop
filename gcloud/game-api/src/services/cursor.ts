import { Agent, CursorAgentError } from "@cursor/sdk";
import { config, requireCursorKey } from "../config.js";
import {
  BUILDER_SYSTEM,
  EDIT_SYSTEM,
  PLANNER_SYSTEM,
  buildBuilderPrompt,
  buildEditPrompt,
  buildPlannerPrompt,
} from "./prompts.js";

async function collectRunText(run: Awaited<ReturnType<Awaited<ReturnType<typeof Agent.create>>["send"]>>): Promise<string> {
  let text = "";
  if (run.supports("stream")) {
    for await (const event of run.stream()) {
      if (event.type === "assistant") {
        for (const block of event.message.content) {
          if (block.type === "text") text += block.text;
        }
      }
    }
  }
  const result = await run.wait();
  if (result.status === "error") {
    throw new Error(`Agent run failed: ${result.id}`);
  }
  return text.trim();
}

export async function runPlanner(userPrompt: string): Promise<string> {
  const apiKey = requireCursorKey();
  const result = await Agent.prompt(
    `${PLANNER_SYSTEM}\n\n${buildPlannerPrompt(userPrompt)}`,
    {
      apiKey,
      model: { id: config.cursorModel },
      local: { cwd: config.webRoot, settingSources: [] },
    }
  );
  if (result.status === "error") {
    throw new Error("Planner agent failed");
  }
  return (result.result ?? "").trim() || fallbackPlan(userPrompt);
}

export interface BuilderResult {
  agentId: string;
  assistantText: string;
}

export async function runBuilder(
  workspaceDir: string,
  plan: string,
  slug: string
): Promise<BuilderResult> {
  const apiKey = requireCursorKey();

  try {
    await using agent = await Agent.create({
      apiKey,
      model: { id: config.cursorModel },
      local: { cwd: workspaceDir, settingSources: [] },
    });

    const run = await agent.send(
      `${BUILDER_SYSTEM}\n\n${buildBuilderPrompt(plan, slug)}`
    );
    const assistantText = await collectRunText(run);
    return { agentId: agent.agentId, assistantText };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Builder startup failed: ${err.message}`);
    }
    throw err;
  }
}

export async function runEditor(
  agentId: string,
  workspaceDir: string,
  userEdit: string,
  plan: string
): Promise<string> {
  const apiKey = requireCursorKey();

  try {
    await using agent = await Agent.resume(agentId, {
      apiKey,
      model: { id: config.cursorModel },
      local: { cwd: workspaceDir, settingSources: [] },
    });

    const run = await agent.send(
      `${EDIT_SYSTEM}\n\n${buildEditPrompt(userEdit, plan)}`
    );
    return collectRunText(run);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Editor startup failed: ${err.message}`);
    }
    throw err;
  }
}

function fallbackPlan(userPrompt: string): string {
  const title = userPrompt.slice(0, 40) || "Hyper Dash";
  return `# ${title}

## Genre
Hypercasual dodge / survival

## Core Loop
Survive as long as possible, score increases over time.

## Controls
Move player with mouse or finger.

## Mechanics
Enemies spawn from sides; collision costs a life; reach score 500 to win.

## Visual Style
Dark purple gradient space background, glowing player orb, red enemy orbs, particles.

## UI/HUD
Score top-left, lives top-right, hint text bottom.

## Win/Lose
Win at 500 score; lose when lives reach 0.

## File Plan
engine.ts, renderer.ts, types.ts, constants.ts`;
}

export function isCursorConfigured(): boolean {
  return Boolean(config.cursorApiKey);
}

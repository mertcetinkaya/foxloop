import { Agent, CursorAgentError } from "@cursor/sdk";
import { config, requireCursorKey } from "../config.js";
import { cursorModelSelection } from "./cursor-model.js";
import {
  BUILDER_SYSTEM,
  EDIT_SYSTEM,
  buildEditPrompt,
  buildInitialBuildMessage,
  buildPolishMessage,
  buildVerifyMessage,
} from "./prompts.js";

function localAgentOptions() {
  return {
    cwd: config.webRoot,
    settingSources: ["project"] as ("project")[],
  };
}

async function collectRunText(
  run: Awaited<ReturnType<Awaited<ReturnType<typeof Agent.create>>["send"]>>
): Promise<string> {
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

export interface BuilderResult {
  agentId: string;
  gamePlan: string;
}

export async function runBuildPipeline(
  workspaceDir: string,
  slug: string,
  userPrompt: string
): Promise<BuilderResult> {
  const apiKey = requireCursorKey();

  try {
    await using agent = await Agent.create({
      apiKey,
      model: cursorModelSelection(),
      local: localAgentOptions(),
    });

    const turn1 = await agent.send({
      text: `${BUILDER_SYSTEM}\n\n${buildInitialBuildMessage(workspaceDir, slug, userPrompt)}`,
    });
    const planText = await collectRunText(turn1);

    const turn2 = await agent.send(buildPolishMessage(workspaceDir));
    await collectRunText(turn2);

    const turn3 = await agent.send(buildVerifyMessage(workspaceDir));
    await collectRunText(turn3);

    return {
      agentId: agent.agentId,
      gamePlan: planText || fallbackPlan(userPrompt),
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Build pipeline failed: ${err.message}`);
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
      model: cursorModelSelection(),
      local: localAgentOptions(),
    });

    const run = await agent.send(
      `${EDIT_SYSTEM}\n\n${buildEditPrompt(userEdit, plan, workspaceDir)}`
    );
    return collectRunText(run);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      throw new Error(`Editor failed: ${err.message}`);
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
Polished 2D canvas — gradients, particles, depth, parallax (like Eat the Smaller Fish).

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

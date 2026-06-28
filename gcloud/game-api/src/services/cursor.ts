import { Agent, CursorAgentError } from "@cursor/sdk";
import { config, requireCursorKey } from "../config.js";
import { cursorModelSelection } from "./cursor-model.js";
import {
  BUILDER_SYSTEM,
  EDIT_SYSTEM,
  buildEditPrompt,
  buildInitialBuildMessage,
} from "./prompts.js";

/** Isolate the agent to the draft workspace only (no repo-wide reads). */
function localAgentOptions(workspaceDir: string) {
  return {
    cwd: workspaceDir,
    settingSources: [] as [],
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
      local: localAgentOptions(workspaceDir),
    });

    const run = await agent.send({
      text: `${BUILDER_SYSTEM}\n\n${buildInitialBuildMessage(workspaceDir, slug, userPrompt)}`,
    });
    const planText = await collectRunText(run);

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
      local: localAgentOptions(workspaceDir),
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
  const title = userPrompt.slice(0, 40) || "Custom Game";
  return `# ${title}

## Genre
Based on the player's idea

## Core Loop
Playable one-screen game matching the prompt.

## Controls
Pointer/touch and keyboard where appropriate.

## Mechanics
Faithful to what the player described.

## Visual Style
Flat playfield, few objects, minimal top HUD.

## UI/HUD
drawMinimalHud only; hint pill only if needed.

## Win/Lose
Clear win and lose conditions for this genre.

## File Plan
engine.ts, renderer.ts, types.ts, constants.ts`;
}

export function isCursorConfigured(): boolean {
  return Boolean(config.cursorApiKey);
}

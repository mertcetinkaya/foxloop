export const BUILDER_SYSTEM = `You are building a Foxloop Forge Lite hypercasual game in TypeScript with Canvas 2D.

Workspace contract:
- ALL game source files MUST live ONLY in the workspace directory given in each message (absolute path).
- Do NOT modify any other files in the repository.

Architecture:
- ONLY edit/create in the workspace: engine.ts, renderer.ts, types.ts, constants.ts, draw-helpers.ts, optional ai.ts.
- Do NOT use Phaser, Pixi, or external game engines.
- Match Foxloop structure: engine.ts (logic), renderer.ts (drawing), types.ts, constants.ts, draw-helpers.ts.
- Export createInitialState, updateGame, restartLevel, setPointer, onPointerDown, onPointerUp, onKey, drawGame, GameState (status: playing|won|lost).
- The game shell calls setPointer, onPointerDown, onPointerUp, onKey — no window/canvas listeners in game files.

Quality bar — read showcase games in this repo:
- src/games/brawl-arena, src/games/city-race, src/games/eat-smaller-fish, src/games/arrow-out
- Oriented sprites, ground shadows, parallax/depth, gradients (not flat rectangles).
- Hypercasual polish: particles, trails, shake, readable HUD.
- Mobile: pointer + onKey for controls.

On the first turn, end your chat reply with a brief markdown summary (Genre, Core Loop, Controls, Visual Style) under 300 words.
Later turns: only edit files; no chat reply needed.`;

export const EDIT_SYSTEM = `You are editing an existing Foxloop Forge Lite draft game.
Apply ONLY the requested changes in the workspace directory given in the message.
Keep hypercasual polish and visual depth (orientation, shadows, parallax).
Modify the minimum files needed (often constants.ts and engine.ts, sometimes renderer.ts).
Do not break exports: createInitialState, updateGame, restartLevel, setPointer, onPointerDown, onPointerUp, onKey, drawGame, GameState.
Never change the game title or cover art — only gameplay files in the workspace.
Your chat reply is not shown — only file edits matter.`;

export function buildInitialBuildMessage(
  workspaceDir: string,
  slug: string,
  userPrompt: string
): string {
  return `Game slug: ${slug}
Workspace directory (write ONLY here): ${workspaceDir}
Local reference copies: ${workspaceDir}/reference-games/ (read-only examples)

User idea:
${userPrompt}

Implement a complete hypercasual canvas game in the workspace. Replace scaffold placeholders.
Read src/games/brawl-arena, src/games/city-race, src/games/eat-smaller-fish, src/games/arrow-out for quality reference.

End with a brief markdown plan (Genre, Core Loop, Controls, Visual Style, Mechanics).`;
}

export function buildPolishMessage(workspaceDir: string): string {
  return `Polish pass for workspace: ${workspaceDir}

Compare renderer.ts and engine.ts to src/games/brawl-arena, src/games/city-race, src/games/eat-smaller-fish.
Improve visual depth, parallax, shadows, motion polish. Fix flat placeholder art.
Do not change exports. Only edit files in ${workspaceDir}. No chat reply.`;
}

export function buildVerifyMessage(workspaceDir: string): string {
  return `Verification pass for workspace: ${workspaceDir}

Ensure exports: createInitialState, updateGame, restartLevel, setPointer, onPointerDown, onPointerUp, onKey, drawGame, GameState.
Fix compile issues. Game must be playable. Only edit ${workspaceDir}. No chat reply.`;
}

export function buildEditPrompt(
  userEdit: string,
  plan: string,
  workspaceDir: string
): string {
  return `Workspace: ${workspaceDir}

Original plan:
${plan}

User change request:
${userEdit}

Apply this change to workspace game files only.`;
}

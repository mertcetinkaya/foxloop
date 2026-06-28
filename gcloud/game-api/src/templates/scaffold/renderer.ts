import { drawFlatPlayfield, drawHintPill, drawMinimalHud } from "./draw-helpers";
import type { RuntimeState } from "./engine";

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: RuntimeState,
  width: number,
  height: number
): void {
  drawFlatPlayfield(ctx, width, height);
  drawMinimalHud(ctx, width, "Tap to play");

  if (state.hint?.trim()) {
    drawHintPill(ctx, width, height, state.hint);
  }
}

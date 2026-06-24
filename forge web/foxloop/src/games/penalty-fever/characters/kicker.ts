import type { KickerDrawOptions } from "./types";
import {
  drawArm,
  drawHead,
  drawLeg,
  drawShadow,
  drawTorso,
  fillStrokePath,
} from "./drawUtils";

/**
 * Draws a stylized outfield player facing the goal (body extends upward, -Y).
 * Anchor (x, y) = feet / ground contact point.
 */
export function drawKickerCharacter(
  ctx: CanvasRenderingContext2D,
  opts: KickerDrawOptions
) {
  const { x, y, scale, kit, pose, animTime } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  drawShadow(ctx, 4, 4, 22, 7);

  const t = animTime * 1000;
  const runCycle = Math.sin(t / 70);
  const runCycle2 = Math.sin(t / 70 + Math.PI);

  switch (pose) {
    case "idle":
      drawKickerIdle(ctx, kit);
      break;
    case "preparing":
      drawKickerPreparing(ctx, kit);
      break;
    case "runup":
      drawKickerRunUp(ctx, kit, runCycle, runCycle2);
      break;
    case "kick":
      drawKickerKick(ctx, kit, 0.85);
      break;
    case "followThrough":
      drawKickerKick(ctx, kit, 1);
      break;
    case "celebrate":
      drawKickerCelebrate(ctx, kit, t);
      break;
    case "miss":
      drawKickerMiss(ctx, kit);
      break;
  }

  ctx.restore();
}

function drawKickerIdle(ctx: CanvasRenderingContext2D, kit: KickerDrawOptions["kit"]) {
  drawTorso(ctx, kit, 0, -78, -38, 17, 13, true);
  drawHead(ctx, kit, 0, -92, 10, 11);

  drawArm(ctx, kit, -14, -72, -24, -58, -28, -48, kit.shirt);
  drawArm(ctx, kit, 14, -72, 24, -58, 28, -48, kit.shirt);

  drawLeg(ctx, kit, -9, -24, -10, -12, -12, 0, 11, 9);
  drawLeg(ctx, kit, 9, -24, 10, -12, 12, 0, 11, 9);
}

function drawKickerPreparing(
  ctx: CanvasRenderingContext2D,
  kit: KickerDrawOptions["kit"]
) {
  ctx.save();
  ctx.rotate(-0.06);
  drawTorso(ctx, kit, 2, -80, -36, 18, 14, true);
  drawHead(ctx, kit, 4, -94, 10, 11);

  drawArm(ctx, kit, -12, -74, -22, -62, -26, -52, kit.shirt);
  drawArm(ctx, kit, 16, -74, 28, -66, 32, -58, kit.shirt);

  // Planted left, right pulled back
  drawLeg(ctx, kit, -11, -22, -14, -10, -16, 0, 11, 9);
  drawLeg(ctx, kit, 10, -22, 18, -18, 24, -8, 11, 9);
  ctx.restore();
}

function drawKickerRunUp(
  ctx: CanvasRenderingContext2D,
  kit: KickerDrawOptions["kit"],
  runCycle: number,
  runCycle2: number
) {
  ctx.save();
  ctx.rotate(-0.1 + runCycle * 0.04);
  drawTorso(ctx, kit, 4, -82, -34, 18, 14, true);
  drawHead(ctx, kit, 6, -96, 10, 11);

  drawArm(ctx, kit, -10, -76, -18 - runCycle * 6, -64, -22 - runCycle * 8, -52, kit.shirt);
  drawArm(ctx, kit, 16, -76, 26 + runCycle2 * 6, -62, 30 + runCycle2 * 8, -50, kit.shirt);

  const lKnee = -10 + runCycle * 8;
  const rKnee = -10 + runCycle2 * 8;
  drawLeg(ctx, kit, -10, -22, -12, lKnee, -14, 0, 11, 9);
  drawLeg(ctx, kit, 10, -22, 14, rKnee, 16, 0, 11, 9);
  ctx.restore();
}

function drawKickerKick(
  ctx: CanvasRenderingContext2D,
  kit: KickerDrawOptions["kit"],
  follow: number
) {
  ctx.save();
  ctx.rotate(-0.14);
  drawTorso(ctx, kit, 6, -84, -32, 18, 14, true);
  drawHead(ctx, kit, 8, -98, 10, 11);

  drawArm(ctx, kit, -8, -78, -4, -92, -2, -102, kit.shirt);
  drawArm(ctx, kit, 18, -78, 32, -70, 36, -58, kit.shirt);

  // Planted leg
  drawLeg(ctx, kit, -12, -20, -14, -8, -16, 0, 11, 9);

  // Kicking leg extended toward goal
  const kickReach = -28 - follow * 18;
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(8, -20);
      ctx.lineTo(14, -24);
      ctx.lineTo(22, kickReach);
      ctx.lineTo(28, kickReach - 4);
      ctx.lineTo(18, -22);
      ctx.closePath();
    },
    kit.shorts,
    kit.outline,
    2
  );
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(20, -26);
      ctx.lineTo(24, kickReach + 2);
      ctx.lineTo(30, kickReach);
      ctx.lineTo(26, -24);
      ctx.closePath();
    },
    kit.socks,
    kit.outline,
    2
  );
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.ellipse(28, kickReach - 2, 11, 6, -0.5, 0, Math.PI * 2);
    },
    kit.boots,
    kit.outline,
    2
  );

  ctx.restore();
}

function drawKickerCelebrate(
  ctx: CanvasRenderingContext2D,
  kit: KickerDrawOptions["kit"],
  t: number
) {
  const bounce = Math.sin(t / 120) * 3;
  ctx.save();
  ctx.translate(0, bounce);
  drawTorso(ctx, kit, 0, -80, -36, 17, 13, true);
  drawHead(ctx, kit, 0, -94, 10, 11);

  drawArm(ctx, kit, -14, -74, -28, -98, -32, -112, kit.shirt);
  drawArm(ctx, kit, 14, -74, 28, -98, 32, -112, kit.shirt);

  drawLeg(ctx, kit, -10, -22, -8, -8, -10, 0, 11, 9);
  drawLeg(ctx, kit, 10, -22, 8, -8, 10, 0, 11, 9);
  ctx.restore();
}

function drawKickerMiss(ctx: CanvasRenderingContext2D, kit: KickerDrawOptions["kit"]) {
  ctx.save();
  ctx.rotate(0.08);
  drawTorso(ctx, kit, -2, -78, -38, 17, 13, true);
  drawHead(ctx, kit, -2, -92, 10, 11);

  drawArm(ctx, kit, -14, -72, -20, -58, -18, -50, kit.shirt);
  drawArm(ctx, kit, 14, -72, 22, -60, 26, -52, kit.shirt);

  drawLeg(ctx, kit, -9, -24, -8, -12, -10, 0, 11, 9);
  drawLeg(ctx, kit, 9, -24, 8, -12, 10, 0, 11, 9);
  ctx.restore();
}

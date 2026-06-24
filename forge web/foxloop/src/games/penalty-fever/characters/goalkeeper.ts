import type { KeeperDrawOptions } from "./types";
import {
  drawArm,
  drawHead,
  drawLeg,
  drawShadow,
  fillStrokePath,
  roundedRectPath,
} from "./drawUtils";

const KEEPER_SLEEVE = "#3d6b28";

/**
 * Draws a stylized goalkeeper facing the kicker (toward +Y / camera).
 * Anchor (x, y) = feet on ground.
 */
export function drawGoalkeeperCharacter(
  ctx: CanvasRenderingContext2D,
  opts: KeeperDrawOptions
) {
  const { x, y, scale, kit, pose, animTime, diveDir, diveAmount } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  drawShadow(ctx, 0, 6, 26, 8);

  const t = animTime * 1000;

  switch (pose) {
    case "idle":
    case "crouch":
      drawKeeperCrouch(ctx, kit, t);
      break;
    case "diveLeft":
      drawKeeperDive(ctx, kit, -1, diveAmount);
      break;
    case "diveRight":
      drawKeeperDive(ctx, kit, 1, diveAmount);
      break;
    case "diveCenter":
      drawKeeperDiveCenter(ctx, kit, diveAmount);
      break;
    case "save":
      drawKeeperSave(ctx, kit, diveDir);
      break;
    case "concede":
      drawKeeperConcede(ctx, kit);
      break;
  }

  ctx.restore();
}

function drawKeeperJersey(
  ctx: CanvasRenderingContext2D,
  kit: KeeperDrawOptions["kit"],
  cx: number,
  topY: number,
  bottomY: number
) {
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(cx - 20, topY + 10);
      ctx.lineTo(cx + 20, topY + 10);
      ctx.lineTo(cx + 15, bottomY);
      ctx.lineTo(cx - 15, bottomY);
      ctx.closePath();
    },
    kit.shirt,
    kit.outline,
    2.5
  );

  // Long keeper sleeves
  fillStrokePath(
    ctx,
    () => {
      roundedRectPath(ctx, cx - 24, topY + 8, 10, 22, 4);
      roundedRectPath(ctx, cx + 14, topY + 8, 10, 22, 4);
    },
    KEEPER_SLEEVE,
    kit.outline,
    2
  );

  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(cx - 14, bottomY);
      ctx.lineTo(cx + 14, bottomY);
      ctx.lineTo(cx + 13, bottomY + 12);
      ctx.lineTo(cx - 13, bottomY + 12);
      ctx.closePath();
    },
    kit.shorts,
    kit.outline,
    2
  );
}

function drawKeeperCrouch(
  ctx: CanvasRenderingContext2D,
  kit: KeeperDrawOptions["kit"],
  t: number
) {
  const bob = Math.sin(t / 400) * 1.5;

  ctx.save();
  ctx.translate(0, bob);

  drawKeeperJersey(ctx, kit, 0, -72, -32);
  drawHead(ctx, kit, 0, -86, 10, 11);

  // Gloves up, ready
  drawArm(ctx, kit, -18, -68, -32, -82, -38, -92, KEEPER_SLEEVE, true);
  drawArm(ctx, kit, 18, -68, 32, -82, 38, -92, KEEPER_SLEEVE, true);

  // Wide crouch stance
  drawLeg(ctx, kit, -14, -20, -22, -8, -28, 0, 12, 10);
  drawLeg(ctx, kit, 14, -20, 22, -8, 28, 0, 12, 10);
  ctx.restore();
}

function drawKeeperDive(
  ctx: CanvasRenderingContext2D,
  kit: KeeperDrawOptions["kit"],
  dir: number,
  amount: number
) {
  const ext = 0.35 + amount * 0.65;
  const angle = dir * (0.55 + ext * 0.85);
  const stretch = ext * 38;

  ctx.save();
  ctx.rotate(angle);
  ctx.translate(dir * stretch * 0.3, -stretch * 0.15);

  drawKeeperJersey(ctx, kit, 0, -58, -22);
  drawHead(ctx, kit, dir * 4, -72, 10, 11);

  const reachX = dir * (30 + stretch);
  const reachY = -78 - stretch * 0.2;

  drawArm(ctx, kit, -8, -54, -18, -66, reachX - dir * 10, reachY, KEEPER_SLEEVE, true);
  drawArm(ctx, kit, 8, -54, 18, -66, reachX + dir * 6, reachY + 6, KEEPER_SLEEVE, true);

  drawLeg(ctx, kit, -10, -12, -18 - dir * 8, -2, -24 - dir * 12, 4, 11, 9);
  drawLeg(ctx, kit, 10, -12, 16 + dir * 4, 0, 22 + dir * 8, 4, 11, 9);

  ctx.restore();
}

function drawKeeperDiveCenter(
  ctx: CanvasRenderingContext2D,
  kit: KeeperDrawOptions["kit"],
  amount: number
) {
  const jump = amount * 14;
  ctx.save();
  ctx.translate(0, -jump);

  drawKeeperJersey(ctx, kit, 0, -68, -28);
  drawHead(ctx, kit, 0, -82, 10, 11);

  drawArm(ctx, kit, -16, -64, -8, -88, 0, -98, KEEPER_SLEEVE, true);
  drawArm(ctx, kit, 16, -64, 8, -88, 0, -98, KEEPER_SLEEVE, true);

  drawLeg(ctx, kit, -12, -16, -10, -4, -12, 0, 11, 9);
  drawLeg(ctx, kit, 12, -16, 10, -4, 12, 0, 11, 9);
  ctx.restore();
}

function drawKeeperSave(
  ctx: CanvasRenderingContext2D,
  kit: KeeperDrawOptions["kit"],
  diveDir: number
) {
  drawKeeperDive(ctx, kit, diveDir === 0 ? -1 : diveDir, 1);
}

function drawKeeperConcede(
  ctx: CanvasRenderingContext2D,
  kit: KeeperDrawOptions["kit"]
) {
  ctx.save();
  ctx.rotate(0.12);
  drawKeeperJersey(ctx, kit, 0, -66, -30);
  drawHead(ctx, kit, 4, -80, 10, 11);

  drawArm(ctx, kit, -16, -62, -10, -48, -6, -40, KEEPER_SLEEVE, true);
  drawArm(ctx, kit, 16, -62, 22, -50, 26, -42, KEEPER_SLEEVE, true);

  drawLeg(ctx, kit, -12, -18, -10, -6, -12, 0, 11, 9);
  drawLeg(ctx, kit, 12, -18, 10, -6, 12, 0, 11, 9);
  ctx.restore();
}

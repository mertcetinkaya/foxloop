import type { CharacterKit } from "./types";

export function withOutline(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  outline: string,
  width = 2.5
) {
  ctx.save();
  ctx.strokeStyle = outline;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  draw();
  ctx.stroke();
  ctx.restore();
}

export function fillPath(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  fill: string
) {
  ctx.save();
  ctx.fillStyle = fill;
  draw();
  ctx.fill();
  ctx.restore();
}

export function fillStrokePath(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  fill: string,
  outline: string,
  width = 2.5
) {
  fillPath(ctx, draw, fill);
  withOutline(ctx, draw, outline, width);
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  outline: string,
  lw = 2.5
) {
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    },
    fill,
    outline,
    lw
  );
}

export function drawLeg(
  ctx: CanvasRenderingContext2D,
  kit: CharacterKit,
  hipX: number,
  hipY: number,
  kneeX: number,
  kneeY: number,
  footX: number,
  footY: number,
  thighW = 11,
  calfW = 9
) {
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(hipX - thighW * 0.45, hipY);
      ctx.lineTo(hipX + thighW * 0.45, hipY);
      ctx.lineTo(kneeX + calfW * 0.45, kneeY);
      ctx.lineTo(footX + calfW * 0.35, footY - 6);
      ctx.lineTo(footX - calfW * 0.35, footY - 6);
      ctx.lineTo(kneeX - calfW * 0.45, kneeY);
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
      ctx.moveTo(kneeX - calfW * 0.4, kneeY);
      ctx.lineTo(kneeX + calfW * 0.4, kneeY);
      ctx.lineTo(footX + calfW * 0.35, footY - 7);
      ctx.lineTo(footX - calfW * 0.35, footY - 7);
      ctx.closePath();
    },
    kit.socks,
    kit.outline,
    2
  );

  fillStrokePath(
    ctx,
    () => {
      roundedRectPath(ctx, footX - 10, footY - 7, 20, 9, 3);
    },
    kit.boots,
    kit.outline,
    2
  );
}

export function drawArm(
  ctx: CanvasRenderingContext2D,
  kit: CharacterKit,
  shoulderX: number,
  shoulderY: number,
  elbowX: number,
  elbowY: number,
  handX: number,
  handY: number,
  sleeveColor: string,
  isGlove = false
) {
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(shoulderX - 5, shoulderY);
      ctx.lineTo(shoulderX + 5, shoulderY);
      ctx.lineTo(elbowX + 4.5, elbowY);
      ctx.lineTo(handX + (isGlove ? 7 : 5), handY);
      ctx.lineTo(handX - (isGlove ? 7 : 5), handY);
      ctx.lineTo(elbowX - 4.5, elbowY);
      ctx.closePath();
    },
    sleeveColor,
    kit.outline,
    2
  );

  if (isGlove) {
    fillStrokePath(
      ctx,
      () => {
        roundedRectPath(ctx, handX - 8, handY - 5, 16, 12, 4);
      },
      "#f5f5f0",
      kit.outline,
      2
    );
  } else {
    drawEllipse(ctx, handX, handY, 5, 5, kit.skin, kit.outline, 1.5);
  }
}

export function drawTorso(
  ctx: CanvasRenderingContext2D,
  kit: CharacterKit,
  cx: number,
  topY: number,
  bottomY: number,
  shoulderW: number,
  waistW: number,
  stripe = false
) {
  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(cx - shoulderW, topY + 8);
      ctx.lineTo(cx + shoulderW, topY + 8);
      ctx.lineTo(cx + waistW, bottomY);
      ctx.lineTo(cx - waistW, bottomY);
      ctx.closePath();
    },
    kit.shirt,
    kit.outline,
    2.5
  );

  if (stripe && kit.shirtSecondary) {
    fillPath(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(cx - 4, topY + 8);
      ctx.lineTo(cx + 4, topY + 8);
      ctx.lineTo(cx + 3, bottomY);
      ctx.lineTo(cx - 3, bottomY);
      ctx.closePath();
    }, kit.shirtSecondary);
  }

  fillStrokePath(
    ctx,
    () => {
      ctx.beginPath();
      ctx.moveTo(cx - waistW, bottomY);
      ctx.lineTo(cx + waistW, bottomY);
      ctx.lineTo(cx + waistW - 1, bottomY + 14);
      ctx.lineTo(cx - waistW + 1, bottomY + 14);
      ctx.closePath();
    },
    kit.shorts,
    kit.outline,
    2
  );
}

export function drawHead(
  ctx: CanvasRenderingContext2D,
  kit: CharacterKit,
  cx: number,
  cy: number,
  rx = 10,
  ry = 11
) {
  drawEllipse(ctx, cx, cy, rx, ry, kit.skin, kit.outline, 2.5);

  fillPath(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(cx, cy - 3, rx + 1, ry * 0.55, 0, Math.PI, Math.PI * 2);
  }, kit.hair);

  withOutline(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(cx, cy - 3, rx + 1, ry * 0.55, 0, Math.PI, Math.PI * 2);
  }, kit.outline, 2);

  ctx.fillStyle = kit.outline;
  ctx.beginPath();
  ctx.ellipse(cx - 3.5, cy - 1, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 3.5, cy - 1, 1.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

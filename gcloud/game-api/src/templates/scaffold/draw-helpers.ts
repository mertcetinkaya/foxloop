/** Shared 2D drawing helpers for depth, orientation, and polish. */
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 0.28
): void {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.35, radius * 1.15, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawParallaxLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scroll: number,
  color: string,
  yBase: number,
  amplitude: number,
  frequency: number
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -40; x <= width + 40; x += 24) {
    const y = yBase + Math.sin((x + scroll) / frequency) * amplitude;
    if (x === -40) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function drawOrientedGlowBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  radius: number,
  coreColor: string,
  edgeColor: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createRadialGradient(0, 0, radius * 0.15, 0, 0, radius);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, coreColor);
  g.addColorStop(1, edgeColor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

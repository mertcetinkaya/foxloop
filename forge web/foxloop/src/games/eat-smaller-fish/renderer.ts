import type { Food, Fish, GameState } from "./types";
import { WIN_SCORE, WORLD_SIZE } from "./constants";
import { worldToScreen } from "./engine";

function drawFish(
  ctx: CanvasRenderingContext2D,
  fish: Fish,
  sx: number,
  sy: number
) {
  const r = fish.radius;
  const angle = fish.angle;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);

  const tailWobble = Math.sin(Date.now() / 200 + fish.id) * 0.15;
  ctx.rotate(tailWobble);

  ctx.beginPath();
  ctx.moveTo(-r * 1.3, 0);
  ctx.lineTo(-r * 2.2, -r * 0.7);
  ctx.lineTo(-r * 2.2, r * 0.7);
  ctx.closePath();
  ctx.fillStyle = fish.color.fin;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.4, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = fish.color.body;
  ctx.fill();

  if (fish.color.stripe) {
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, 0, r * 0.25, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = fish.color.stripe;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 0.25, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(r * 0.62, -r * 0.25, r * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a2e";
  ctx.fill();

  ctx.restore();

  const label = fish.isPlayer ? String(fish.score) : String(fish.score);
  const nameLabel = fish.isPlayer ? "You" : fish.name ?? "";

  ctx.font = `bold ${Math.max(11, r * 0.45)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeText(nameLabel, sx, sy - r - 14);
  ctx.fillText(nameLabel, sx, sy - r - 14);

  ctx.font = `bold ${Math.max(13, r * 0.5)}px system-ui, sans-serif`;
  ctx.strokeText(label, sx, sy + r + 18);
  ctx.fillText(label, sx, sy + r + 18);
}

function drawFood(
  ctx: CanvasRenderingContext2D,
  food: Food,
  sx: number,
  sy: number
) {
  const wobble = Math.sin(Date.now() / 400 + food.wobble) * 3;
  const r = food.radius;

  ctx.save();
  ctx.translate(sx, sy + wobble);

  if (food.type === "starfish") {
    ctx.fillStyle = food.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerX = Math.cos(a) * r;
      const outerY = Math.sin(a) * r;
      const innerA = a + Math.PI / 5;
      const innerX = Math.cos(innerA) * r * 0.4;
      const innerY = Math.sin(innerA) * r * 0.4;
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
  } else if (food.type === "seaweed") {
    ctx.strokeStyle = food.color;
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 4, r);
      ctx.quadraticCurveTo(i * 8 + wobble, 0, i * 3, -r);
      ctx.stroke();
    }
  } else if (food.type === "worm") {
    ctx.strokeStyle = food.color;
    ctx.lineWidth = r * 0.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.quadraticCurveTo(0, -r * 0.8, r, 0);
    ctx.stroke();
  } else {
    ctx.fillStyle = food.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.2, r * 0.7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = food.secondary;
    ctx.beginPath();
    ctx.arc(-r * 0.3, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camera: { x: number; y: number }
) {
  const grad = ctx.createLinearGradient(0, 0, 0, viewH);
  grad.addColorStop(0, "#0d4f5c");
  grad.addColorStop(0.5, "#1a6b7a");
  grad.addColorStop(1, "#0f5a68");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  const waveY = viewH - 60;
  ctx.strokeStyle = "rgba(100, 180, 200, 0.25)";
  ctx.lineWidth = 4;
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    const offset = ((camera.x * 0.3 + layer * 100) % 200) - 100;
    for (let x = -50; x <= viewW + 50; x += 30) {
      const y =
        waveY + layer * 12 + Math.sin((x + offset) / 40 + layer) * 8;
      if (x === -50) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.03)";
  const gridSize = 120;
  const startX =
    Math.floor((camera.x - viewW / 2) / gridSize) * gridSize;
  const startY =
    Math.floor((camera.y - viewH / 2) / gridSize) * gridSize;
  for (let gx = startX; gx < camera.x + viewW / 2 + gridSize; gx += gridSize) {
    for (
      let gy = startY;
      gy < camera.y + viewH / 2 + gridSize;
      gy += gridSize
    ) {
      const p = worldToScreen(gx, gy, camera, viewW, viewH);
      if (p.x >= 0 && p.x <= viewW && p.y >= 0 && p.y <= viewH) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawWorldBounds(
  ctx: CanvasRenderingContext2D,
  camera: { x: number; y: number },
  viewW: number,
  viewH: number
) {
  const corners = [
    worldToScreen(0, 0, camera, viewW, viewH),
    worldToScreen(WORLD_SIZE, 0, camera, viewW, viewH),
    worldToScreen(WORLD_SIZE, WORLD_SIZE, camera, viewW, viewH),
    worldToScreen(0, WORLD_SIZE, camera, viewW, viewH),
  ];
  ctx.strokeStyle = "rgba(255,100,100,0.3)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  viewW: number,
  viewH: number
) {
  const shake =
    state.screenShake > 0
      ? (Math.random() - 0.5) * state.screenShake * 12
      : 0;

  ctx.save();
  ctx.translate(shake, shake);

  drawBackground(ctx, viewW, viewH, state.camera);
  drawWorldBounds(ctx, state.camera, viewW, viewH);

  for (const food of state.foods) {
    const p = worldToScreen(food.x, food.y, state.camera, viewW, viewH);
    if (p.x < -50 || p.x > viewW + 50 || p.y < -50 || p.y > viewH + 50)
      continue;
    drawFood(ctx, food, p.x, p.y);
  }

  const allFish = [...state.npcs, state.player].sort(
    (a, b) => a.radius - b.radius
  );
  for (const fish of allFish) {
    const p = worldToScreen(fish.x, fish.y, state.camera, viewW, viewH);
    if (p.x < -100 || p.x > viewW + 100 || p.y < -100 || p.y > viewH + 100)
      continue;
    drawFish(ctx, fish, p.x, p.y);
  }

  for (const p of state.particles) {
    const sp = worldToScreen(p.x, p.y, state.camera, viewW, viewH);
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const ft of state.floatingTexts) {
    const sp = worldToScreen(ft.x, ft.y, state.camera, viewW, viewH);
    ctx.globalAlpha = ft.life;
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, sp.x, sp.y);
    ctx.fillText(ft.text, sp.x, sp.y);
    ctx.globalAlpha = 1;
  }

  if (state.eatFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 200, ${state.eatFlash * 2})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  ctx.restore();

  drawHud(ctx, state, viewW, viewH);
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  viewW: number,
  viewH: number
) {
  const progress = Math.min(state.player.score / WIN_SCORE, 1);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(16, 16, 200, 36, 18);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.roundRect(20, 28, 192, 8, 4);
  ctx.fill();

  ctx.fillStyle = "#ff9f43";
  ctx.beginPath();
  ctx.roundRect(20, 28, 192 * progress, 8, 4);
  ctx.fill();

  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(`${state.player.score} / ${WIN_SCORE}`, 24, 24);

  const boostY = 58;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(16, boostY, 120, 22, 11);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.roundRect(20, boostY + 8, 112, 6, 3);
  ctx.fill();
  const boostColor =
    state.boosting && state.boostEnergy > 0.02 ? "#74b9ff" : "#4ecdc4";
  ctx.fillStyle = boostColor;
  ctx.beginPath();
  ctx.roundRect(20, boostY + 8, 112 * state.boostEnergy, 6, 3);
  ctx.fill();
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = "#a8d8ea";
  ctx.textAlign = "left";
  ctx.fillText("Boost (hold click)", 20, boostY + 6);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.roundRect(viewW - 216, 16, 200, 36, 18);
  ctx.fill();
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillStyle = "#a8d8ea";
  ctx.textAlign = "right";
  ctx.fillText("Move · hold to dash", viewW - 24, 38);
}

import {
  FOOD_TYPES,
  NPC_COLORS,
  PLAYER_COLOR,
  START_SCORE,
  WIN_SCORE,
  WORLD_SIZE,
  BOOST_DRAIN_RATE,
  BOOST_RECHARGE_RATE,
  BOOST_SPEED_MULTIPLIER,
  radiusFromScore,
  randomInRange,
  distance,
  speedFromRadius,
  clamp,
} from "./constants";
import type {
  Food,
  Fish,
  FloatingText,
  GameState,
  Particle,
} from "./types";

const NPC_NAMES = [
  "facebook",
  "swift_shark",
  "coral_king",
  "bubble",
  "neon_fish",
  "deep_diver",
  "tide_runner",
  "wave_chaser",
];

export function createInitialState(): GameState {
  const player: Fish = {
    id: 0,
    x: WORLD_SIZE / 2,
    y: WORLD_SIZE / 2,
    score: START_SCORE,
    radius: radiusFromScore(START_SCORE),
    angle: 0,
    vx: 0,
    vy: 0,
    color: PLAYER_COLOR,
    isPlayer: true,
    wanderTimer: 0,
    name: "You",
  };

  const state: GameState = {
    player,
    npcs: [],
    foods: [],
    floatingTexts: [],
    particles: [],
    status: "playing",
    camera: { x: player.x, y: player.y },
    mouseWorld: { x: player.x, y: player.y + 80 },
    nextId: 1,
    eatFlash: 0,
    screenShake: 0,
    pendingNpcSpawns: [],
    boosting: false,
    boostEnergy: 1,
  };

  for (let i = 0; i < 50; i++) spawnFood(state);
  for (let i = 0; i < 18; i++) spawnNpc(state, randomInRange(8, 80));

  return state;
}

function nextId(state: GameState): number {
  return state.nextId++;
}

export function spawnFood(state: GameState): Food {
  const template =
    FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
  const margin = 60;
  const food: Food = {
    id: nextId(state),
    x: randomInRange(margin, WORLD_SIZE - margin),
    y: randomInRange(margin, WORLD_SIZE - margin),
    type: template.type,
    points: template.points,
    radius: template.radius,
    color: template.color,
    secondary: template.secondary,
    wobble: Math.random() * Math.PI * 2,
  };
  state.foods.push(food);
  return food;
}

export function spawnNpc(state: GameState, score?: number): Fish {
  const margin = 100;
  const targetScore =
    score ?? randomInRange(
      Math.max(5, state.player.score * 0.4),
      state.player.score * 1.6 + 40
    );
  const color = NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];
  const npc: Fish = {
    id: nextId(state),
    x: randomInRange(margin, WORLD_SIZE - margin),
    y: randomInRange(margin, WORLD_SIZE - margin),
    score: Math.round(targetScore),
    radius: radiusFromScore(targetScore),
    angle: Math.random() * Math.PI * 2,
    vx: 0,
    vy: 0,
    color,
    isPlayer: false,
    wanderTimer: randomInRange(0.5, 2.5),
    name: NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)],
  };
  state.npcs.push(npc);
  return npc;
}

export function addFloatingText(
  state: GameState,
  x: number,
  y: number,
  text: string
) {
  state.floatingTexts.push({
    x,
    y,
    text,
    life: 1,
    maxLife: 1.2,
  });
}

export function addParticles(
  state: GameState,
  x: number,
  y: number,
  color: string,
  count = 12
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomInRange(40, 160);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: randomInRange(0.4, 0.9),
      color,
      size: randomInRange(2, 5),
    });
  }
}

export function addBubbles(state: GameState, x: number, y: number, count = 6) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: x + randomInRange(-10, 10),
      y: y + randomInRange(-10, 10),
      vx: randomInRange(-20, 20),
      vy: randomInRange(-60, -20),
      life: 1,
      maxLife: randomInRange(0.6, 1.2),
      color: "rgba(255,255,255,0.7)",
      size: randomInRange(2, 4),
    });
  }
}

function foodAsTarget(food: Food) {
  return {
    x: food.x,
    y: food.y,
    score: food.points,
    radius: food.radius,
  };
}

function tryEat(
  state: GameState,
  eater: Fish,
  target: { x: number; y: number; score: number; radius: number; isPlayer?: boolean },
  onEaten: () => void
): boolean {
  const dist = distance(eater.x, eater.y, target.x, target.y);
  const eatThreshold = (eater.radius + target.radius) * 0.65;

  if (dist >= eatThreshold) return false;

  if (eater.score > target.score) {
    const gained = target.score;
    eater.score += gained;
    eater.radius = radiusFromScore(eater.score);
    addFloatingText(state, target.x, target.y - target.radius, `+${gained}`);
    addParticles(state, target.x, target.y, eater.color.body, 10);
    addBubbles(state, target.x, target.y, 4);
    state.eatFlash = 0.15;
    onEaten();

    if (target.isPlayer) {
      state.status = "lost";
      state.screenShake = 0.5;
      addParticles(state, target.x, target.y, "#ff4757", 25);
    } else if (eater.isPlayer && eater.score >= WIN_SCORE) {
      state.status = "won";
      addParticles(state, eater.x, eater.y, "#ffd700", 30);
    }
    return true;
  }

  return false;
}

function updateNpcAI(state: GameState, npc: Fish, dt: number) {
  const player = state.player;
  const distToPlayer = distance(npc.x, npc.y, player.x, player.y);
  const speed = speedFromRadius(npc.radius) * 0.85;

  let targetX = npc.x;
  let targetY = npc.y;

  npc.wanderTimer -= dt;
  if (npc.wanderTimer <= 0) {
    npc.wanderTimer = randomInRange(1, 3);
    npc.angle = Math.random() * Math.PI * 2;
  }

  if (npc.score > player.score && distToPlayer < 350) {
    targetX = player.x;
    targetY = player.y;
  } else if (npc.score < player.score && distToPlayer < 280) {
    targetX = npc.x - (player.x - npc.x);
    targetY = npc.y - (player.y - npc.y);
  } else {
    let nearestFood: Food | null = null;
    let nearestDist = 200;
    for (const food of state.foods) {
      const d = distance(npc.x, npc.y, food.x, food.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestFood = food;
      }
    }
    if (nearestFood) {
      targetX = nearestFood.x;
      targetY = nearestFood.y;
    } else {
      targetX = npc.x + Math.cos(npc.angle) * 200;
      targetY = npc.y + Math.sin(npc.angle) * 200;
    }
  }

  const dx = targetX - npc.x;
  const dy = targetY - npc.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 2) {
    npc.x += (dx / dist) * speed * dt;
    npc.y += (dy / dist) * speed * dt;
    npc.angle = Math.atan2(dy, dx);
  }

  npc.x = clamp(npc.x, npc.radius, WORLD_SIZE - npc.radius);
  npc.y = clamp(npc.y, npc.radius, WORLD_SIZE - npc.radius);
}

export function updateGame(state: GameState, dt: number) {
  if (state.status !== "playing") return;

  dt = Math.min(dt, 0.05);

  const player = state.player;
  let speed = speedFromRadius(player.radius);

  const canBoost = state.boostEnergy > 0.02;
  if (state.boosting && canBoost) {
    speed *= BOOST_SPEED_MULTIPLIER;
    state.boostEnergy = Math.max(0, state.boostEnergy - BOOST_DRAIN_RATE * dt);
    if (Math.random() < 0.4) {
      addBubbles(
        state,
        player.x - Math.cos(player.angle) * player.radius,
        player.y - Math.sin(player.angle) * player.radius,
        2
      );
    }
  } else {
    state.boostEnergy = Math.min(1, state.boostEnergy + BOOST_RECHARGE_RATE * dt);
  }

  const dx = state.mouseWorld.x - player.x;
  const dy = state.mouseWorld.y - player.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 8) {
    const moveSpeed = speed * dt;
    player.x += (dx / dist) * moveSpeed;
    player.y += (dy / dist) * moveSpeed;
    player.angle = Math.atan2(dy, dx);
  }

  player.x = clamp(player.x, player.radius, WORLD_SIZE - player.radius);
  player.y = clamp(player.y, player.radius, WORLD_SIZE - player.radius);

  state.camera.x += (player.x - state.camera.x) * 8 * dt;
  state.camera.y += (player.y - state.camera.y) * 8 * dt;

  for (const npc of state.npcs) {
    updateNpcAI(state, npc, dt);
  }

  for (let i = state.foods.length - 1; i >= 0; i--) {
    const food = state.foods[i];
    if (
      tryEat(state, player, foodAsTarget(food), () => {
        state.foods.splice(i, 1);
        spawnFood(state);
      })
    ) {
      continue;
    }

    for (const npc of state.npcs) {
      if (
        tryEat(state, npc, foodAsTarget(food), () => {
          const idx = state.foods.indexOf(food);
          if (idx !== -1) {
            state.foods.splice(idx, 1);
            spawnFood(state);
          }
        })
      ) {
        break;
      }
    }
  }

  for (let i = state.npcs.length - 1; i >= 0; i--) {
    const npc = state.npcs[i];
    if (
      tryEat(state, player, npc, () => {
        state.npcs.splice(i, 1);
        state.pendingNpcSpawns.push(performance.now() + 500);
      })
    ) {
      continue;
    }

    if (tryEat(state, npc, player, () => {})) {
      break;
    }

    for (let j = state.npcs.length - 1; j >= 0; j--) {
      if (i === j) continue;
      const other = state.npcs[j];
      if (
        tryEat(state, npc, other, () => {
          state.npcs.splice(j, 1);
          state.pendingNpcSpawns.push(performance.now() + 800);
        })
      ) {
        break;
      }
    }
  }

  if (state.pendingNpcSpawns.length > 0) {
    const now = performance.now();
    state.pendingNpcSpawns = state.pendingNpcSpawns.filter((t) => {
      if (now >= t) {
        spawnNpc(state);
        return false;
      }
      return true;
    });
  }

  if (state.npcs.length < 15) {
    spawnNpc(state);
  }

  for (const ft of state.floatingTexts) {
    ft.y -= 40 * dt;
    ft.life -= dt / ft.maxLife;
  }
  state.floatingTexts = state.floatingTexts.filter((ft) => ft.life > 0);

  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 30 * dt;
    p.life -= dt / p.maxLife;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  if (state.eatFlash > 0) state.eatFlash -= dt;
  if (state.screenShake > 0) state.screenShake -= dt;
}

export function worldToScreen(
  wx: number,
  wy: number,
  camera: { x: number; y: number },
  viewW: number,
  viewH: number
) {
  return {
    x: wx - camera.x + viewW / 2,
    y: wy - camera.y + viewH / 2,
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  camera: { x: number; y: number },
  viewW: number,
  viewH: number
) {
  return {
    x: sx - viewW / 2 + camera.x,
    y: sy - viewH / 2 + camera.y,
  };
}

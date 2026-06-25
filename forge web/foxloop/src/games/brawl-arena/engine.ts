import {
  ENEMY_ACCENT,
  ENEMY_COLOR,
  GRAVITY,
  HURT_DURATION,
  JUMP_VELOCITY,
  KICK_DAMAGE,
  KICK_DURATION,
  MAX_ROUNDS,
  MOVE_SPEED,
  PLAYER_ACCENT,
  PLAYER_COLOR,
  PUNCH_DAMAGE,
  PUNCH_DURATION,
  ROUND_TIME,
  clamp,
} from "./constants";
import type { Fighter, GameState, HitSpark } from "./types";

function makeFighter(
  isPlayer: boolean,
  x: number,
  groundY: number
): Fighter {
  const h = isPlayer ? 72 : 68;
  return {
    x,
    y: groundY - h,
    vx: 0,
    vy: 0,
    width: 44,
    height: h,
    health: 100,
    maxHealth: 100,
    facing: isPlayer ? 1 : -1,
    state: "idle",
    stateTimer: 0,
    onGround: true,
    isPlayer,
    color: isPlayer ? PLAYER_COLOR : ENEMY_COLOR,
    accent: isPlayer ? PLAYER_ACCENT : ENEMY_ACCENT,
    combo: 0,
  };
}

export function createInitialState(arenaW = 800, arenaH = 600): GameState {
  const groundY = arenaH * 0.78;
  return {
    status: "playing",
    player: makeFighter(true, arenaW * 0.28, groundY),
    enemy: makeFighter(false, arenaW * 0.72, groundY),
    arenaW,
    arenaH,
    groundY,
    round: 1,
    maxRounds: MAX_ROUNDS,
    playerWins: 0,
    enemyWins: 0,
    roundTimer: ROUND_TIME,
    sparks: [],
    screenShake: 0,
    slowMo: 0,
    keys: {},
    moveLeft: false,
    moveRight: false,
    wantJump: false,
    wantPunch: false,
    wantKick: false,
  };
}

export function restartLevel(state: GameState): void {
  const next = createInitialState(state.arenaW, state.arenaH);
  Object.assign(state, next);
}

function addSpark(state: GameState, x: number, y: number, color: string) {
  state.sparks.push({ x, y, life: 1, maxLife: 0.35, color });
}

function overlapAttack(attacker: Fighter, target: Fighter): boolean {
  const reach = attacker.state === "kick" ? 58 : 42;
  const ax = attacker.x + attacker.facing * (attacker.width * 0.35);
  const dx = target.x - ax;
  const dy = Math.abs(target.y + target.height * 0.5 - (attacker.y + attacker.height * 0.45));
  return Math.abs(dx) < reach && dy < 50 && Math.sign(dx) === attacker.facing;
}

function applyHit(
  state: GameState,
  attacker: Fighter,
  target: Fighter,
  damage: number
) {
  if (target.state === "hurt" && target.stateTimer > 0.05) return;
  target.health = Math.max(0, target.health - damage);
  target.state = "hurt";
  target.stateTimer = HURT_DURATION;
  target.vx = attacker.facing * 180;
  target.vy = -120;
  target.onGround = false;
  attacker.combo += 1;
  state.screenShake = 0.35;
  state.slowMo = 0.08;
  addSpark(
    state,
    target.x,
    target.y + target.height * 0.4,
    attacker.isPlayer ? "#ffeaa7" : "#ff7675"
  );
}

function resolveAttacks(state: GameState) {
  const { player, enemy } = state;
  if (player.state === "punch" && player.stateTimer > PUNCH_DURATION * 0.35) {
    if (overlapAttack(player, enemy)) applyHit(state, player, enemy, PUNCH_DAMAGE);
  }
  if (player.state === "kick" && player.stateTimer > KICK_DURATION * 0.35) {
    if (overlapAttack(player, enemy)) applyHit(state, player, enemy, KICK_DAMAGE);
  }
  if (enemy.state === "punch" && enemy.stateTimer > PUNCH_DURATION * 0.35) {
    if (overlapAttack(enemy, player)) applyHit(state, enemy, player, PUNCH_DAMAGE);
  }
  if (enemy.state === "kick" && enemy.stateTimer > KICK_DURATION * 0.35) {
    if (overlapAttack(enemy, player)) applyHit(state, enemy, player, KICK_DAMAGE);
  }
}

function updateFighterPhysics(f: Fighter, state: GameState, dt: number) {
  f.vy += GRAVITY * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  const margin = 24;
  f.x = clamp(f.x, margin, state.arenaW - margin - f.width);

  if (f.y + f.height >= state.groundY) {
    f.y = state.groundY - f.height;
    f.vy = 0;
    f.onGround = true;
    f.vx *= 0.72;
  } else {
    f.onGround = false;
  }

  if (f.stateTimer > 0) {
    f.stateTimer -= dt;
    if (f.stateTimer <= 0 && f.state !== "idle") {
      if (f.state === "hurt") f.state = "idle";
      if (f.state === "punch" || f.state === "kick") f.state = "idle";
    }
  }
}

function startAttack(f: Fighter, kind: "punch" | "kick") {
  if (f.state === "hurt") return;
  if (f.state === "punch" || f.state === "kick") return;
  f.state = kind;
  f.stateTimer = kind === "punch" ? PUNCH_DURATION : KICK_DURATION;
  f.vx = 0;
}

function updatePlayerInput(state: GameState, dt: number) {
  const p = state.player;
  if (p.state === "hurt") return;

  let move = 0;
  if (state.moveLeft || state.keys.ArrowLeft || state.keys.a) move -= 1;
  if (state.moveRight || state.keys.ArrowRight || state.keys.d) move += 1;

  if (state.wantPunch) {
    startAttack(p, "punch");
    state.wantPunch = false;
  }
  if (state.wantKick) {
    startAttack(p, "kick");
    state.wantKick = false;
  }

  if (p.state === "punch" || p.state === "kick") return;

  if (move !== 0) {
    p.vx = move * MOVE_SPEED;
    p.facing = move > 0 ? 1 : -1;
    p.state = "walk";
  } else {
    p.vx *= 0.8;
    if (p.onGround) p.state = "idle";
  }

  if (state.wantJump && p.onGround) {
    p.vy = JUMP_VELOCITY;
    p.onGround = false;
    p.state = "jump";
    state.wantJump = false;
  }
}

function updateEnemyAI(state: GameState, dt: number) {
  const e = state.enemy;
  const p = state.player;
  if (e.state === "hurt") return;

  const dx = p.x - e.x;
  const dist = Math.abs(dx);
  e.facing = dx >= 0 ? 1 : -1;

  if (e.state === "punch" || e.state === "kick") return;

  if (dist < 55 && Math.random() < dt * 2.2) {
    startAttack(e, Math.random() < 0.55 ? "punch" : "kick");
    return;
  }

  if (dist > 90) {
    e.vx = e.facing * MOVE_SPEED * 0.75;
    e.state = "walk";
  } else if (dist < 40) {
    e.vx = -e.facing * MOVE_SPEED * 0.6;
    e.state = "walk";
  } else {
    e.vx *= 0.8;
    e.state = "idle";
  }

  if (e.onGround && dist < 70 && Math.random() < dt * 0.8) {
    e.vy = JUMP_VELOCITY * 0.85;
    e.onGround = false;
    e.state = "jump";
  }
}

function endRound(state: GameState, playerWon: boolean) {
  if (playerWon) state.playerWins += 1;
  else state.enemyWins += 1;

  if (state.playerWins >= 2 || state.enemyWins >= 2) {
    state.status = state.playerWins >= 2 ? "won" : "lost";
    return;
  }

  state.round += 1;
  state.roundTimer = ROUND_TIME;
  const groundY = state.groundY;
  state.player = makeFighter(true, state.arenaW * 0.28, groundY);
  state.enemy = makeFighter(false, state.arenaW * 0.72, groundY);
  state.sparks = [];
}

export function updateGame(state: GameState, dt: number) {
  if (state.status !== "playing") return;
  dt = Math.min(dt, 0.05);
  if (state.slowMo > 0) {
    dt *= 0.45;
    state.slowMo -= dt;
  }

  state.roundTimer = Math.max(0, state.roundTimer - dt);

  updatePlayerInput(state, dt);
  updateEnemyAI(state, dt);
  updateFighterPhysics(state.player, state, dt);
  updateFighterPhysics(state.enemy, state, dt);
  resolveAttacks(state);

  for (const s of state.sparks) {
    s.life -= dt / s.maxLife;
  }
  state.sparks = state.sparks.filter((s) => s.life > 0);

  if (state.screenShake > 0) state.screenShake -= dt;

  if (state.player.health <= 0) endRound(state, false);
  else if (state.enemy.health <= 0) endRound(state, true);
  else if (state.roundTimer <= 0) {
    endRound(state, state.player.health >= state.enemy.health);
  }
}

export function setMoveLeft(state: GameState, v: boolean) {
  state.moveLeft = v;
}
export function setMoveRight(state: GameState, v: boolean) {
  state.moveRight = v;
}
export function triggerJump(state: GameState) {
  state.wantJump = true;
}
export function triggerPunch(state: GameState) {
  state.wantPunch = true;
}
export function triggerKick(state: GameState) {
  state.wantKick = true;
}

export function onKey(state: GameState, key: string, down: boolean) {
  state.keys[key] = down;
  if (key === " " && down) state.wantJump = true;
  if (key === "j" && down) state.wantPunch = true;
  if (key === "k" && down) state.wantKick = true;
}

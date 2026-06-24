import type { GoalZone, ShotData, ShotHeight } from "./types";
import {
  AIM_ARROW_MAX_X,
  AIM_ARROW_MIN_X,
  GOAL_BBOX,
  GOAL_ZONES,
  HOLD_HEIGHT_MS,
  KEEPER_AI,
  OPPONENT_SHOT_AI,
  SAVE_RADIUS,
  DEFEND_SAVE_THRESHOLD,
  getZoneCenter,
  pointToZone,
  stageDifficulty,
} from "./constants";
import type { TournamentStage } from "./types";

function rand(): number {
  return Math.random();
}

function pickWeighted<T extends string>(
  items: { value: T; weight: number }[]
): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function cornerZones(): GoalZone[] {
  return ["top_left", "top_right", "low_left", "low_right"];
}

function centerZones(): GoalZone[] {
  return ["middle_center", "top_center", "low_center"];
}

export function heightFromHold(holdMs: number): ShotHeight {
  const heightPower = Math.min(1, Math.max(0, holdMs / HOLD_HEIGHT_MS));
  if (heightPower < 0.25) return "low";
  if (heightPower < 0.65) return "mid";
  return "high";
}

export function buildPlayerShot(
  aimX: number,
  holdMs: number,
  difficulty: number
): ShotData {
  const height = heightFromHold(holdMs);
  const noise = (1 - difficulty * 0.08) * (20 + rand() * 30);
  const targetX = aimX + (rand() - 0.5) * noise;
  const rowOffset =
    height === "low" ? 0.75 : height === "mid" ? 0.45 : 0.15;
  const targetY =
    GOAL_BBOX.y + GOAL_BBOX.height * rowOffset + (rand() - 0.5) * noise;

  const inGoal =
    targetX >= GOAL_BBOX.x &&
    targetX <= GOAL_BBOX.x + GOAL_BBOX.width &&
    targetY >= GOAL_BBOX.y &&
    targetY <= GOAL_BBOX.y + GOAL_BBOX.height;

  const zone = inGoal ? pointToZone(targetX, targetY) ?? "middle_center" : "miss";

  return {
    targetX,
    targetY,
    power: Math.min(1, holdMs / HOLD_HEIGHT_MS + 0.3),
    height,
    zone,
    isOnTarget: inGoal,
    canBeSaved: inGoal,
  };
}

export function pickKeeperAIDive(
  stage: TournamentStage,
  firstClick: { initialAimX: number } | null,
  finalAimX: number,
  finalZone: GoalZone | "miss"
): GoalZone {
  const diff = stageDifficulty(stage);
  const readFirst =
    KEEPER_AI.readFirstClickChance + diff * 0.06 + rand() * 0.1;
  const readSecond =
    KEEPER_AI.readSecondClickChance + diff * 0.04 + rand() * 0.08;
  const wrongChance =
    KEEPER_AI.wrongDiveChance - diff * 0.04 + rand() * 0.05;

  if (rand() < wrongChance) {
    const others = GOAL_ZONES.filter((z) => z !== finalZone);
    return others[Math.floor(rand() * others.length)];
  }

  if (firstClick && rand() < readFirst) {
    const seededX = firstClick.initialAimX;
    const zone = pointToZone(seededX, GOAL_BBOX.y + GOAL_BBOX.height * 0.5);
    if (zone) return zone;
  }

  if (rand() < readSecond && finalZone !== "miss") {
    return finalZone;
  }

  if (rand() < KEEPER_AI.baseGuessChance + diff * 0.05) {
    if (finalZone !== "miss") return finalZone;
  }

  const corners = cornerZones();
  const centers = centerZones();
  return pickWeighted([
    { value: corners[Math.floor(rand() * corners.length)], weight: 0.4 },
    { value: centers[Math.floor(rand() * centers.length)], weight: 0.35 },
    { value: GOAL_ZONES[Math.floor(rand() * GOAL_ZONES.length)], weight: 0.25 },
  ]);
}

export function resolveDefendSave(
  shot: ShotData,
  keeperTarget: { x: number; y: number } | null
): "goal" | "saved" | "miss" {
  if (!shot.isOnTarget || shot.zone === "miss") return "miss";
  if (!keeperTarget) return "goal";

  const dist = Math.hypot(
    shot.targetX - keeperTarget.x,
    shot.targetY - keeperTarget.y
  );

  if (dist <= DEFEND_SAVE_THRESHOLD) return "saved";
  return "goal";
}

export function resolveKeeperSave(
  shot: ShotData,
  diveZone: GoalZone | null,
  reactionMs: number,
  difficulty: number
): "goal" | "saved" | "miss" {
  if (!shot.isOnTarget || shot.zone === "miss") return "miss";

  const saveRadius = SAVE_RADIUS - difficulty * 12;
  const maxReaction = 1200 - difficulty * 80;

  if (reactionMs > maxReaction) return "goal";

  if (!diveZone) return "goal";

  const ballCenter = { x: shot.targetX, y: shot.targetY };
  const diveCenter = getZoneCenter(diveZone);
  const dist = Math.hypot(ballCenter.x - diveCenter.x, ballCenter.y - diveCenter.y);

  if (dist < saveRadius) return "saved";
  return "goal";
}

export function resolveOpponentKeeper(
  shot: ShotData,
  diveZone: GoalZone,
  difficulty: number
): "goal" | "saved" | "miss" {
  return resolveKeeperSave(shot, diveZone, 400, difficulty);
}

export function generateOpponentShot(stage: TournamentStage): ShotData {
  const diff = stageDifficulty(stage);
  const profile =
    diff === 0
      ? OPPONENT_SHOT_AI.easy
      : diff === 1
        ? OPPONENT_SHOT_AI.medium
        : OPPONENT_SHOT_AI.hard;

  const roll = rand();
  if (roll < profile.missChance) {
    const missX =
      rand() < 0.5
        ? GOAL_BBOX.x - 40 - rand() * 80
        : GOAL_BBOX.x + GOAL_BBOX.width + 40 + rand() * 80;
    const missY = GOAL_BBOX.y + rand() * GOAL_BBOX.height;
    return {
      targetX: missX,
      targetY: missY,
      power: 0.7,
      height: "mid",
      zone: "miss",
      isOnTarget: false,
      canBeSaved: false,
    };
  }

  let zone: GoalZone;
  if (roll < profile.missChance + profile.cornerChance) {
    const corners = cornerZones();
    zone = corners[Math.floor(rand() * corners.length)];
  } else {
    const centers = centerZones();
    zone = centers[Math.floor(rand() * centers.length)];
  }

  const center = getZoneCenter(zone);
  const jitter = 18 - diff * 3;
  const heightRoll = rand();
  const height: ShotHeight =
    heightRoll < 0.3 ? "low" : heightRoll < 0.7 ? "mid" : "high";
  const rowOffset =
    height === "low" ? 0.75 : height === "mid" ? 0.45 : 0.15;
  const targetY = GOAL_BBOX.y + GOAL_BBOX.height * rowOffset + (rand() - 0.5) * jitter;

  return {
    targetX: center.x + (rand() - 0.5) * jitter,
    targetY,
    power: 0.6 + rand() * 0.4,
    height,
    zone,
    isOnTarget: true,
    canBeSaved: true,
  };
}

export function clampAimX(x: number): number {
  return Math.max(AIM_ARROW_MIN_X, Math.min(AIM_ARROW_MAX_X, x));
}

export function initialAimX(): number {
  return (AIM_ARROW_MIN_X + AIM_ARROW_MAX_X) / 2;
}

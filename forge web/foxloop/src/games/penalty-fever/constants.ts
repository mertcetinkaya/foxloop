import type { GoalZone, Team, TournamentStage } from "./types";

export const SCENE_WIDTH = 1626;
export const SCENE_HEIGHT = 1212;

export const GOAL_BBOX = { x: 489, y: 283, width: 688, height: 233 };
export const GOAL_FRAME = { x: 482, y: 276, width: 704, height: 242 };
export const BALL_START = { x: 830, y: 863 };
export const KICKER_ANCHOR = { x: 656, y: 1048 };
export const KEEPER_ANCHOR = { x: 830, y: 519 };
export const AIM_ARROW_CENTER = { x: 760, y: 734 };

export const GRID_COLS = 3;
export const GRID_ROWS = 3;

export const GOAL_ZONES: GoalZone[] = [
  "top_left",
  "top_center",
  "top_right",
  "middle_left",
  "middle_center",
  "middle_right",
  "low_left",
  "low_center",
  "low_right",
];

export const STAGE_LABELS: Record<TournamentStage, string> = {
  round_of_16: "1/16 Fin",
  round_of_8: "1/8 Fin",
  quarter_final: "1/4 Fin",
  semi_final: "Semi Fin",
  final: "Final",
};

export const STAGE_ORDER: TournamentStage[] = [
  "round_of_16",
  "round_of_8",
  "quarter_final",
  "semi_final",
  "final",
];

export const TEAMS: Team[] = [
  { id: "lyon", name: "Lyon", primaryColor: "#003399", secondaryColor: "#cc0000", shortColor: "#082e55" },
  { id: "steaua", name: "Steaua", primaryColor: "#cc0000", secondaryColor: "#003399", shortColor: "#1a1a4e" },
  { id: "ajax", name: "Ajax", primaryColor: "#cc0000", secondaryColor: "#ffffff", shortColor: "#1a1a1a" },
  { id: "porto", name: "Porto", primaryColor: "#003399", secondaryColor: "#ffffff", shortColor: "#1a1a4e" },
  { id: "celtic", name: "Celtic", primaryColor: "#009933", secondaryColor: "#ffffff", shortColor: "#1a1a1a" },
  { id: "galatasaray", name: "Galatasaray", primaryColor: "#cc6600", secondaryColor: "#cc0000", shortColor: "#1a1a1a" },
  { id: "benfica", name: "Benfica", primaryColor: "#cc0000", secondaryColor: "#ffffff", shortColor: "#1a1a4e" },
  { id: "psv", name: "PSV", primaryColor: "#cc0000", secondaryColor: "#ffffff", shortColor: "#1a1a1a" },
  { id: "feyenoord", name: "Feyenoord", primaryColor: "#cc0000", secondaryColor: "#ffffff", shortColor: "#1a1a1a" },
  { id: "rangers", name: "Rangers", primaryColor: "#003399", secondaryColor: "#cc0000", shortColor: "#1a1a4e" },
  { id: "sporting", name: "Sporting", primaryColor: "#009933", secondaryColor: "#ffffff", shortColor: "#1a1a1a" },
  { id: "basel", name: "Basel", primaryColor: "#cc0000", secondaryColor: "#003399", shortColor: "#1a1a4e" },
  { id: "anderlecht", name: "Anderlecht", primaryColor: "#663399", secondaryColor: "#ffffff", shortColor: "#1a1a1a" },
  { id: "dynamo", name: "Dynamo", primaryColor: "#003399", secondaryColor: "#ffffff", shortColor: "#1a1a4e" },
  { id: "redstar", name: "Red Star", primaryColor: "#cc0000", secondaryColor: "#ffffff", shortColor: "#1a1a1a" },
  { id: "olympiacos", name: "Olympiacos", primaryColor: "#cc0000", secondaryColor: "#ffffff", shortColor: "#1a1a4e" },
];

export const KEEPER_AI = {
  baseGuessChance: 0.28,
  readFirstClickChance: 0.35,
  readSecondClickChance: 0.15,
  wrongDiveChance: 0.22,
};

export const OPPONENT_SHOT_AI = {
  easy: { centerChance: 0.35, cornerChance: 0.25, missChance: 0.18 },
  medium: { centerChance: 0.22, cornerChance: 0.42, missChance: 0.10 },
  hard: { centerChance: 0.12, cornerChance: 0.58, missChance: 0.05 },
};

export const AIM_ARROW_Y = 734;
export const AIM_ARROW_SPEED = 280;
export const AIM_ARROW_MIN_X = GOAL_BBOX.x + 40;
export const AIM_ARROW_MAX_X = GOAL_BBOX.x + GOAL_BBOX.width - 40;

export const RETURN_THRESHOLD = 8;
export const MIN_TIME_BEFORE_AUTO_RESOLVE_MS = 300;
export const SAVE_THRESHOLD = 70;

export const GOAL_AREA_BOUNDS = {
  left: GOAL_BBOX.x + 24,
  right: GOAL_BBOX.x + GOAL_BBOX.width - 24,
  top: GOAL_BBOX.y + 24,
  bottom: GOAL_BBOX.y + GOAL_BBOX.height - 24,
};

export function clampToGoalArea(
  x: number,
  y: number,
  bounds = GOAL_AREA_BOUNDS
): { x: number; y: number } {
  return {
    x: Math.max(bounds.left, Math.min(bounds.right, x)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, y)),
  };
}

export function initialGreenTargetPosition(): { x: number; y: number } {
  return {
    x: GOAL_BBOX.x + GOAL_BBOX.width / 2,
    y: GOAL_BBOX.y + GOAL_BBOX.height * 0.55,
  };
}

export const DEFEND_ADJUST_S = 3.5;
export const DEFEND_KEEPER_DIVE_S = 0.3;
export const DEFEND_RED_HINT_BEFORE_KICK_S = 1.0;
export const DEFEND_SAVE_THRESHOLD = 50;

export function arrowXToGoalTarget(arrowX: number): { x: number; y: number } {
  const t =
    (arrowX - AIM_ARROW_MIN_X) / (AIM_ARROW_MAX_X - AIM_ARROW_MIN_X);
  return {
    x: GOAL_BBOX.x + t * GOAL_BBOX.width,
    y: GOAL_BBOX.y + GOAL_BBOX.height * 0.45,
  };
}

export const HOLD_HEIGHT_MS = 450;
export const SAVE_RADIUS = 95;
export const MAX_REACTION_WINDOW_MS = 1200;
export const RED_MARKER_DURATION_MS = 650;
export const BALL_FLIGHT_MS = 680;

export function stageDifficulty(stage: TournamentStage): number {
  switch (stage) {
    case "round_of_16":
      return 0;
    case "round_of_8":
      return 0;
    case "quarter_final":
      return 1;
    case "semi_final":
      return 2;
    case "final":
      return 3;
  }
}

export function getZoneCenter(zone: GoalZone): { x: number; y: number } {
  const col = GOAL_ZONES.indexOf(zone) % GRID_COLS;
  const row = Math.floor(GOAL_ZONES.indexOf(zone) / GRID_COLS);
  const cellW = GOAL_BBOX.width / GRID_COLS;
  const cellH = GOAL_BBOX.height / GRID_ROWS;
  return {
    x: GOAL_BBOX.x + col * cellW + cellW / 2,
    y: GOAL_BBOX.y + row * cellH + cellH / 2,
  };
}

export function pointToZone(x: number, y: number): GoalZone | null {
  if (
    x < GOAL_BBOX.x ||
    x > GOAL_BBOX.x + GOAL_BBOX.width ||
    y < GOAL_BBOX.y ||
    y > GOAL_BBOX.y + GOAL_BBOX.height
  ) {
    return null;
  }
  const col = Math.min(
    GRID_COLS - 1,
    Math.floor((x - GOAL_BBOX.x) / (GOAL_BBOX.width / GRID_COLS))
  );
  const row = Math.min(
    GRID_ROWS - 1,
    Math.floor((y - GOAL_BBOX.y) / (GOAL_BBOX.height / GRID_ROWS))
  );
  return GOAL_ZONES[row * GRID_COLS + col];
}

export function zoneDistance(a: GoalZone, b: GoalZone): number {
  const ca = getZoneCenter(a);
  const cb = getZoneCenter(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

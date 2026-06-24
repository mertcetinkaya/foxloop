import {
  AIM_ARROW_MAX_X,
  AIM_ARROW_MIN_X,
  AIM_ARROW_SPEED,
  arrowXToGoalTarget,
  BALL_FLIGHT_MS,
  BALL_START,
  clampToGoalArea,
  DEFEND_ADJUST_S,
  DEFEND_KEEPER_DIVE_S,
  DEFEND_RED_HINT_BEFORE_KICK_S,
  initialGreenTargetPosition,
  MIN_TIME_BEFORE_AUTO_RESOLVE_MS,
  pointToZone,
  RETURN_THRESHOLD,
  SAVE_THRESHOLD,
  stageDifficulty,
} from "./constants";
import {
  clampAimX,
  generateOpponentShot,
  initialAimX,
  resolveDefendSave,
} from "./ai";
import {
  advanceBracket,
  createBracket,
  currentMatch,
  isTournamentComplete,
  tournamentWon,
} from "./tournament";
import type {
  GameState,
  GoalZone,
  KickResult,
  MatchPhase,
  ShootoutState,
  Team,
} from "./types";

function createShootout(): ShootoutState {
  return {
    round: 1,
    playerKicksTaken: 0,
    opponentKicksTaken: 0,
    playerScore: 0,
    opponentScore: 0,
    maxRegularKicks: 5,
    suddenDeath: false,
    isPlayerTurn: true,
    winner: null,
  };
}

function createMatchState() {
  return {
    phase: "aiming" as MatchPhase,
    shootingState: "aiming_before_first_click" as const,
    aimArrowX: initialAimX(),
    aimDirection: 1,
    fakeTarget: null,
    realTarget: null,
    fakeTargetArrowX: null,
    ghostArrowVisible: false,
    firstClickTime: null,
    hasArrowLeftFakeZone: false,
    forcedSave: false,
    pendingKickResult: null,
    currentShot: null,
    lastKickResult: null,
    ball: {
      x: BALL_START.x,
      y: BALL_START.y,
      scale: 1,
      spin: 0,
      visible: true,
    },
    ballT: 0,
    kicker: { phase: "idle" as const, frame: 0, timer: 0 },
    keeper: { phase: "idle" as const, diveZone: null, frame: 0, timer: 0 },
    defendState: null,
    greenTargetPosition: initialGreenTargetPosition(),
    lockedKeeperTarget: null,
    greenTargetLocked: false,
    redHintVisible: false,
    opponentShot: null,
    phaseTimer: 0,
    resultText: null,
    resultTextTimer: 0,
  };
}

export function createInitialState(): GameState {
  return {
    screen: "team_select",
    playerTeam: null,
    opponentTeam: null,
    stage: "round_of_16",
    bracket: [],
    shootout: createShootout(),
    match: createMatchState(),
    floatingTexts: [],
    difficulty: 0,
    now: 0,
  };
}

export function selectTeam(state: GameState, team: Team): void {
  state.playerTeam = team;
  state.bracket = createBracket(team);
  state.screen = "bracket";
}

export function startMatch(state: GameState): void {
  const match = currentMatch(state.bracket);
  if (!match || !state.playerTeam) return;

  state.opponentTeam = match.opponentTeam;
  state.stage = match.stage;
  state.difficulty = stageDifficulty(match.stage);
  state.shootout = createShootout();
  state.match = createMatchState();
  state.match.phase = "aiming";
  state.screen = "match";
}

export function screenToScene(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  containerW: number,
  containerH: number
): { x: number; y: number; scale: number } {
  const scale = Math.min(containerW / 1626, containerH / 1212);
  const renderedW = 1626 * scale;
  const renderedH = 1212 * scale;
  const offsetX = (containerW - renderedW) / 2;
  const offsetY = (containerH - renderedH) / 2;
  const localX = clientX - canvasRect.left - offsetX;
  const localY = clientY - canvasRect.top - offsetY;
  return {
    x: localX / scale,
    y: localY / scale,
    scale,
  };
}

function addFloatingText(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color: string
): void {
  state.floatingTexts.push({
    x,
    y,
    text,
    color,
    life: 1.8,
    maxLife: 1.8,
    scale: 1,
  });
}

function checkShootoutWinner(shootout: ShootoutState): void {
  const {
    playerScore,
    opponentScore,
    playerKicksTaken,
    opponentKicksTaken,
    maxRegularKicks,
    suddenDeath,
  } = shootout;

  const remainingPlayer = maxRegularKicks - playerKicksTaken;
  const remainingOpponent = maxRegularKicks - opponentKicksTaken;

  if (!suddenDeath) {
    if (playerScore > opponentScore + remainingOpponent) {
      shootout.winner = "player";
      return;
    }
    if (opponentScore > playerScore + remainingPlayer) {
      shootout.winner = "opponent";
      return;
    }
    if (
      playerKicksTaken >= maxRegularKicks &&
      opponentKicksTaken >= maxRegularKicks
    ) {
      if (playerScore !== opponentScore) {
        shootout.winner =
          playerScore > opponentScore ? "player" : "opponent";
      } else {
        shootout.suddenDeath = true;
        shootout.round = maxRegularKicks + 1;
      }
    }
  }

  if (suddenDeath) {
    if (
      playerKicksTaken > 0 &&
      opponentKicksTaken > 0 &&
      playerKicksTaken === opponentKicksTaken &&
      playerScore !== opponentScore
    ) {
      shootout.winner =
        playerScore > opponentScore ? "player" : "opponent";
    }
  }
}

function beginNextTurn(state: GameState): void {
  const { shootout, match } = state;
  checkShootoutWinner(shootout);

  if (shootout.winner) {
    match.phase = "shootout_end";
    match.phaseTimer = 0;
    match.resultText =
      shootout.winner === "player" ? "YOU WIN!" : "YOU LOSE!";
    match.resultTextTimer = 2.5;
    return;
  }

  match.phase = shootout.isPlayerTurn ? "aiming" : "opponent_run_up";
  match.shootingState = "aiming_before_first_click";
  match.phaseTimer = 0;
  match.fakeTarget = null;
  match.realTarget = null;
  match.fakeTargetArrowX = null;
  match.ghostArrowVisible = false;
  match.firstClickTime = null;
  match.hasArrowLeftFakeZone = false;
  match.forcedSave = false;
  match.pendingKickResult = null;
  match.currentShot = null;
  match.opponentShot = null;
  match.defendState = null;
  match.greenTargetPosition = initialGreenTargetPosition();
  match.lockedKeeperTarget = null;
  match.greenTargetLocked = false;
  match.redHintVisible = false;
  match.lastKickResult = null;
  match.resultText = null;
  match.aimArrowX = initialAimX();
  match.kicker = { phase: "idle", frame: 0, timer: 0 };
  match.keeper = { phase: "idle", diveZone: null, frame: 0, timer: 0 };
  match.ball = {
    x: BALL_START.x,
    y: BALL_START.y,
    scale: 1,
    spin: 0,
    visible: true,
  };
  match.ballT = 0;
}

function applyKickResult(
  state: GameState,
  result: KickResult,
  scorerIsPlayer: boolean
): void {
  const { shootout, match } = state;

  if (result === "goal") {
    if (scorerIsPlayer) shootout.playerScore++;
    else shootout.opponentScore++;
    match.resultText = "GOAL!";
    addFloatingText(state, 830, 350, "GOAL!", "#00ff2f");
  } else if (result === "saved") {
    match.resultText = "SAVED!";
    addFloatingText(state, 830, 350, "SAVED!", "#f2ea00");
  } else {
    match.resultText = "MISS!";
    addFloatingText(state, 830, 350, "MISS!", "#ff4444");
  }

  match.resultTextTimer = 1.4;
  match.lastKickResult = result;

  if (scorerIsPlayer) shootout.playerKicksTaken++;
  else shootout.opponentKicksTaken++;

  if (!shootout.suddenDeath) {
    shootout.round = Math.max(
      shootout.playerKicksTaken,
      shootout.opponentKicksTaken
    ) + 1;
  } else {
    shootout.round++;
  }

  shootout.isPlayerTurn = !shootout.isPlayerTurn;
  match.phase = "turn_transition";
  match.phaseTimer = 0;
}

function updateAimArrow(match: GameState["match"], dt: number): void {
  if (
    match.shootingState !== "aiming_before_first_click" &&
    match.shootingState !== "fake_target_locked"
  ) {
    return;
  }

  match.aimArrowX += match.aimDirection * AIM_ARROW_SPEED * dt;
  if (match.aimArrowX >= AIM_ARROW_MAX_X) {
    match.aimArrowX = AIM_ARROW_MAX_X;
    match.aimDirection = -1;
  } else if (match.aimArrowX <= AIM_ARROW_MIN_X) {
    match.aimArrowX = AIM_ARROW_MIN_X;
    match.aimDirection = 1;
  }
  match.aimArrowX = clampAimX(match.aimArrowX);
}

function startShotResolution(
  state: GameState,
  realTargetArrowX: number,
  forcedSave: boolean
): void {
  const { match } = state;
  if (match.shootingState !== "fake_target_locked" || match.fakeTargetArrowX === null) {
    return;
  }

  const fakeGoal = arrowXToGoalTarget(match.fakeTargetArrowX);
  const realGoal = arrowXToGoalTarget(realTargetArrowX);

  match.fakeTarget = fakeGoal;
  match.realTarget = realGoal;
  match.forcedSave = forcedSave;
  match.shootingState = "shot_resolving";
  match.phase = "kick";
  match.kicker = { phase: "kick", frame: 0, timer: 0 };
  match.phaseTimer = 0;

  const dist = Math.hypot(fakeGoal.x - realGoal.x, fakeGoal.y - realGoal.y);
  match.pendingKickResult =
    forcedSave || dist <= SAVE_THRESHOLD ? "saved" : "goal";

  const fakeZone = pointToZone(fakeGoal.x, fakeGoal.y);
  match.keeper = {
    phase: "dive",
    diveZone: fakeZone,
    frame: 0,
    timer: 0,
  };

  match.currentShot = {
    targetX: realGoal.x,
    targetY: realGoal.y,
    power: 0.8,
    height: "mid",
    zone: pointToZone(realGoal.x, realGoal.y) ?? "middle_center",
    isOnTarget: true,
    canBeSaved: true,
  };
}

function checkAutoResolve(state: GameState, now: number): void {
  const { match } = state;
  if (match.shootingState !== "fake_target_locked") return;
  if (match.fakeTargetArrowX === null || match.firstClickTime === null) return;

  const elapsed = now - match.firstClickTime;
  const arrowDist = Math.abs(match.aimArrowX - match.fakeTargetArrowX);

  if (arrowDist >= RETURN_THRESHOLD) {
    match.hasArrowLeftFakeZone = true;
  }

  if (
    elapsed >= MIN_TIME_BEFORE_AUTO_RESOLVE_MS &&
    match.hasArrowLeftFakeZone &&
    arrowDist < RETURN_THRESHOLD
  ) {
    startShotResolution(state, match.fakeTargetArrowX, true);
  }
}

function lockKeeperTarget(match: GameState["match"]): void {
  if (match.greenTargetLocked) return;
  match.greenTargetLocked = true;
  match.lockedKeeperTarget = { ...match.greenTargetPosition };
  match.defendState = "keeper_target_locked";
}

function canMoveGreenTarget(match: GameState["match"]): boolean {
  return (
    match.phase === "defending" &&
    !match.greenTargetLocked &&
    (match.defendState === "green_target_active" ||
      match.defendState === "red_hint_visible" ||
      match.defendState === "memory_adjust_window")
  );
}

export function handlePointerMove(
  state: GameState,
  sceneX: number,
  sceneY: number
): void {
  if (state.screen !== "match") return;
  const { match } = state;
  if (!canMoveGreenTarget(match)) return;

  match.greenTargetPosition = clampToGoalArea(sceneX, sceneY);
}

export function handlePointerDown(
  state: GameState,
  sceneX: number,
  sceneY: number,
  now: number
): void {
  if (state.screen !== "match") return;
  const { match, shootout } = state;

  if (match.phase === "aiming" && shootout.isPlayerTurn) {
    if (match.shootingState === "aiming_before_first_click") {
      match.fakeTargetArrowX = match.aimArrowX;
      match.fakeTarget = arrowXToGoalTarget(match.aimArrowX);
      match.ghostArrowVisible = true;
      match.firstClickTime = now;
      match.hasArrowLeftFakeZone = false;
      match.shootingState = "fake_target_locked";
      match.kicker = { phase: "runup", frame: 0, timer: 0 };
    } else if (match.shootingState === "fake_target_locked") {
      startShotResolution(state, match.aimArrowX, false);
    }
    return;
  }

  if (match.phase === "defending" && !shootout.isPlayerTurn) {
    if (canMoveGreenTarget(match)) {
      match.greenTargetPosition = clampToGoalArea(sceneX, sceneY);
      lockKeeperTarget(match);
    }
    return;
  }
}

export function handlePointerUp(
  _state: GameState,
  _now: number
): void {
  // Player shooting uses click-click, not press-release.
}

function updateBallFlight(state: GameState, dt: number): void {
  const { match } = state;
  const shot = match.currentShot;
  if (!shot) return;

  match.ballT += dt / (BALL_FLIGHT_MS / 1000);
  const t = Math.min(1, match.ballT);

  const start = BALL_START;
  const end = { x: shot.targetX, y: shot.targetY };
  const cp = { x: (start.x + end.x) / 2 - 40, y: (start.y + end.y) / 2 - 80 };

  const u = 1 - t;
  match.ball.x = u * u * start.x + 2 * u * t * cp.x + t * t * end.x;
  match.ball.y = u * u * start.y + 2 * u * t * cp.y + t * t * end.y;
  match.ball.scale = 1 - t * 0.45;
  match.ball.spin += dt * 18;

  if (t >= 1) {
    match.phase = "resolve_shot";
    match.phaseTimer = 0;
  }
}

function updateRedHintVisibility(match: GameState["match"]): void {
  if (!match.opponentShot?.isOnTarget) {
    match.redHintVisible = false;
    return;
  }

  let timeUntilKick = 0;
  if (match.phase === "defending") {
    timeUntilKick =
      DEFEND_ADJUST_S + DEFEND_KEEPER_DIVE_S - match.phaseTimer;
  } else if (match.phase === "keeper_dive") {
    timeUntilKick = DEFEND_KEEPER_DIVE_S - match.phaseTimer;
  } else {
    match.redHintVisible = false;
    return;
  }

  match.redHintVisible =
    timeUntilKick <= DEFEND_RED_HINT_BEFORE_KICK_S && timeUntilKick > 0;
}

function updateDefendingPhase(state: GameState, dt: number): void {
  const { match } = state;
  match.phaseTimer += dt;

  if (match.phaseTimer < 0.5) {
    match.defendState = "green_target_active";
  } else if (match.greenTargetLocked) {
    match.defendState = "keeper_target_locked";
  } else {
    match.defendState = "memory_adjust_window";
  }

  updateRedHintVisibility(match);

  if (match.redHintVisible) {
    match.defendState = "red_hint_visible";
  }

  if (match.phaseTimer >= DEFEND_ADJUST_S) {
    if (!match.greenTargetLocked) {
      lockKeeperTarget(match);
    }
    match.phase = "keeper_dive";
    match.keeper = { phase: "dive", diveZone: null, frame: 0, timer: 0 };
    match.phaseTimer = 0;
  }
}

function updateOpponentSequence(state: GameState, dt: number): void {
  const { match, stage } = state;

  if (match.phase === "opponent_run_up") {
    match.phaseTimer += dt;
    match.kicker = { phase: "runup", frame: 0, timer: match.phaseTimer };
    if (match.phaseTimer >= 0.9) {
      match.opponentShot = generateOpponentShot(stage);
      match.greenTargetPosition = initialGreenTargetPosition();
      match.lockedKeeperTarget = null;
      match.greenTargetLocked = false;
      match.redHintVisible = false;
      match.defendState = "green_target_active";
      match.phase = "defending";
      match.phaseTimer = 0;
    }
  } else if (match.phase === "defending") {
    updateDefendingPhase(state, dt);
  } else if (match.phase === "keeper_dive") {
    match.phaseTimer += dt;
    updateRedHintVisibility(match);
    if (match.phaseTimer >= DEFEND_KEEPER_DIVE_S) {
      match.redHintVisible = false;
      match.phase = "ball_flight";
      match.currentShot = match.opponentShot;
      match.ballT = 0;
      match.phaseTimer = 0;
      match.defendState = "shot_resolving";
    }
  }
}

function resolveShotPhase(state: GameState): void {
  const { match } = state;
  const shot = match.currentShot;
  if (!shot) return;

  if (match.opponentShot && !state.shootout.isPlayerTurn) {
    const result = resolveDefendSave(shot, match.lockedKeeperTarget) as KickResult;
    applyKickResult(state, result, false);
    match.defendState = "shot_finished";
  } else if (match.pendingKickResult) {
    applyKickResult(state, match.pendingKickResult, true);
    match.shootingState = "shot_finished";
    match.pendingKickResult = null;
  }
}

export function updateGame(state: GameState, dt: number, now: number): void {
  state.now = now;

  state.floatingTexts = state.floatingTexts
    .map((t) => ({ ...t, life: t.life - dt }))
    .filter((t) => t.life > 0);

  if (state.screen !== "match") return;

  const { match } = state;

  if (match.resultTextTimer > 0) {
    match.resultTextTimer -= dt;
    if (match.resultTextTimer <= 0) match.resultText = null;
  }

  if (match.phase === "aiming") {
    updateAimArrow(match, dt);
    checkAutoResolve(state, now);
  }

  if (match.phase === "kick") {
    match.phaseTimer += dt;
    if (match.phaseTimer >= 0.2) {
      match.phase = "ball_flight";
      match.ballT = 0;
      match.phaseTimer = 0;
    }
  }

  if (match.phase === "ball_flight") {
    updateBallFlight(state, dt);
  }

  if (
    match.phase === "opponent_run_up" ||
    match.phase === "defending" ||
    match.phase === "keeper_dive"
  ) {
    updateOpponentSequence(state, dt);
  }

  if (match.phase === "resolve_shot") {
    resolveShotPhase(state);
  }

  if (match.phase === "turn_transition") {
    match.phaseTimer += dt;
    if (match.phaseTimer >= 1.2) {
      beginNextTurn(state);
    }
  }

  if (match.phase === "shootout_end") {
    match.phaseTimer += dt;
    if (match.phaseTimer >= 2.5) {
      const won = state.shootout.winner === "player";
      state.bracket = advanceBracket(state.bracket, won);
      if (won && !isTournamentComplete(state.bracket)) {
        state.screen = "bracket";
      } else if (won && tournamentWon(state.bracket)) {
        state.screen = "tournament_won";
      } else {
        state.screen = "match_result";
      }
    }
  }

  match.kicker.timer += dt;
  match.keeper.timer += dt;
}

export function continueFromBracket(state: GameState): void {
  startMatch(state);
}

export function continueAfterLoss(state: GameState): void {
  if (state.playerTeam) {
    state.bracket = createBracket(state.playerTeam);
    state.screen = "team_select";
    state.playerTeam = null;
  }
}

export function getRenderScale(containerW: number, containerH: number) {
  return Math.min(containerW / 1626, containerH / 1212);
}

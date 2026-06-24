import type { GameState } from "./types";
import {
  GOAL_BBOX,
  GOAL_FRAME,
  KICKER_ANCHOR,
  KEEPER_ANCHOR,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  STAGE_LABELS,
} from "./constants";
import { getRenderScale } from "./engine";
import {
  drawGoalkeeperCharacter,
  drawKickerCharacter,
  kitFromTeam,
  type KickerPose,
  type KeeperPose,
} from "./characters";

function drawCrowd(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(16, 17, 16, 171);
  g.addColorStop(0, "#1a2840");
  g.addColorStop(1, "#2a3a55");
  ctx.fillStyle = g;
  ctx.fillRect(16, 17, 1600, 154);

  for (let i = 0; i < 120; i++) {
    const x = 30 + (i * 47) % 1560;
    const y = 40 + ((i * 13) % 100);
    ctx.fillStyle = `hsl(${(i * 37) % 360}, 40%, ${35 + (i % 20)}%)`;
    ctx.beginPath();
    ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAdBoards(ctx: CanvasRenderingContext2D) {
  const colors = ["#78b899", "#d5d9cf", "#3d9f63", "#5a8a72"];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(16 + i * 200, 171, 196, 153);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FOXLOOP", 16 + i * 200 + 98, 260);
  }
}

function drawPitch(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(16, 323, 16, 1181);
  g.addColorStop(0, "#4aad4e");
  g.addColorStop(0.5, "#62be66");
  g.addColorStop(1, "#72cc76");
  ctx.fillStyle = g;
  ctx.fillRect(16, 323, 1600, 858);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 2;
  for (let y = 340; y < 1180; y += 28) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(1616, y);
    ctx.stroke();
  }
}

function drawGoalNet(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(482, 193);
  ctx.lineTo(1186, 193);
  ctx.lineTo(1176, 278);
  ctx.lineTo(491, 278);
  ctx.closePath();
  ctx.stroke();

  for (let x = 491; x <= 1176; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, 193);
    ctx.lineTo(x + 8, 278);
    ctx.stroke();
  }
  for (let y = 193; y <= 278; y += 8) {
    const t = (y - 193) / 85;
    const lx = 482 + t * 9;
    const rx = 1186 - t * 10;
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(rx, y);
    ctx.stroke();
  }
}

function drawGoalFrame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#3f3f3f";
  ctx.shadowBlur = 4;
  ctx.fillRect(GOAL_FRAME.x, GOAL_FRAME.y, 8, GOAL_FRAME.height);
  ctx.fillRect(GOAL_FRAME.x + GOAL_FRAME.width - 8, GOAL_FRAME.y, 8, GOAL_FRAME.height);
  ctx.fillRect(GOAL_FRAME.x, GOAL_FRAME.y, GOAL_FRAME.width, 8);
  ctx.fillRect(GOAL_FRAME.x, GOAL_FRAME.y + GOAL_FRAME.height - 6, GOAL_FRAME.width, 6);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  for (let x = GOAL_BBOX.x; x <= GOAL_BBOX.x + GOAL_BBOX.width; x += 13) {
    ctx.beginPath();
    ctx.moveTo(x, GOAL_BBOX.y);
    ctx.lineTo(x, GOAL_BBOX.y + GOAL_BBOX.height);
    ctx.stroke();
  }
  for (let y = GOAL_BBOX.y; y <= GOAL_BBOX.y + GOAL_BBOX.height; y += 13) {
    ctx.beginPath();
    ctx.moveTo(GOAL_BBOX.x, y);
    ctx.lineTo(GOAL_BBOX.x + GOAL_BBOX.width, y);
    ctx.stroke();
  }
}

function drawFieldLines(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.shadowColor = "#cfd8cf";
  ctx.shadowBlur = 2;

  ctx.beginPath();
  ctx.moveTo(16, 515);
  ctx.lineTo(1616, 515);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(16, 682);
  ctx.lineTo(1616, 682);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(16, 1076);
  ctx.lineTo(1616, 1076);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(16, 1126);
  ctx.lineTo(188, 1181);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(1616, 1127);
  ctx.lineTo(1463, 1181);
  ctx.stroke();

  ctx.shadowBlur = 0;
}

function drawHud(ctx: CanvasRenderingContext2D, state: GameState) {
  const playerName = state.playerTeam?.name ?? "You";
  const opponentName = state.opponentTeam?.name ?? "Rival";
  const { playerScore, opponentScore, round } = state.shootout;

  ctx.fillStyle = "rgba(12, 8, 45, 0.72)";
  roundRect(ctx, 37, 20, 586, 143, 18);
  ctx.fill();

  ctx.fillStyle = "rgba(12, 8, 45, 0.72)";
  roundRect(ctx, 635, 19, 828, 76, 18);
  ctx.fill();

  ctx.font = "400 40px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(playerName, 80, 70);
  ctx.font = "400 35px system-ui, sans-serif";
  ctx.fillText(opponentName, 80, 130);

  ctx.font = "400 43px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(String(playerScore), 525, 65);
  ctx.fillText(String(opponentScore), 525, 127);

  ctx.font = "400 50px system-ui, sans-serif";
  ctx.fillStyle = "#f2ea00";
  ctx.textAlign = "left";
  ctx.fillText(`Turn: ${round}`, 660, 65);

  ctx.fillStyle = "#00ff2f";
  ctx.fillText(STAGE_LABELS[state.stage], 980, 65);
}

function roundRect(
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

function resolveKickerPose(state: GameState): KickerPose {
  const { kicker, phase, shootingState, opponentShot, lastKickResult } =
    state.match;

  if (phase === "turn_transition") {
    if (lastKickResult === "goal") return "celebrate";
    if (lastKickResult === "miss") return "miss";
  }

  if (phase === "ball_flight" && !opponentShot) return "followThrough";
  if (kicker.phase === "kick" || phase === "kick") return "kick";
  if (shootingState === "fake_target_locked") return "preparing";
  if (kicker.phase === "runup") return "runup";
  return "idle";
}

function resolveKeeperPose(
  diveDir: number,
  isDiving: boolean,
  diveAmount: number,
  lastResult: GameState["match"]["lastKickResult"],
  phase: GameState["match"]["phase"]
): KeeperPose {
  if (phase === "turn_transition" && lastResult === "goal") return "concede";
  if (phase === "turn_transition" && lastResult === "saved") return "save";

  if (!isDiving || diveAmount < 0.08) return "crouch";

  if (Math.abs(diveDir) < 0.35) return "diveCenter";
  return diveDir < 0 ? "diveLeft" : "diveRight";
}

function drawGoalkeeper(ctx: CanvasRenderingContext2D, state: GameState) {
  const {
    keeper,
    phase,
    fakeTarget,
    opponentShot,
    ballT,
    phaseTimer,
    lastKickResult,
  } = state.match;
  const isPlayerKeeper =
    phase === "opponent_run_up" ||
    phase === "defending" ||
    phase === "keeper_dive" ||
    (phase === "ball_flight" && opponentShot);

  const isPlayerShot =
    !opponentShot &&
    fakeTarget &&
    (phase === "kick" || phase === "ball_flight");

  let x = KEEPER_ANCHOR.x;
  let y = KEEPER_ANCHOR.y;
  let diveDir = 0;
  let diveAmount = 0;
  let isDiving = false;

  if (isPlayerShot && fakeTarget) {
    if (phase === "kick") {
      diveAmount = Math.min(1, phaseTimer / 0.2) * 0.25;
    } else {
      diveAmount = 0.25 + ballT * 0.75;
    }
    const targetY = fakeTarget.y + 40;
    x = KEEPER_ANCHOR.x + (fakeTarget.x - KEEPER_ANCHOR.x) * diveAmount;
    y = KEEPER_ANCHOR.y + (targetY - KEEPER_ANCHOR.y) * diveAmount;
    isDiving = diveAmount > 0.12;
    diveDir =
      fakeTarget.x < KEEPER_ANCHOR.x - 20
        ? -1
        : fakeTarget.x > KEEPER_ANCHOR.x + 20
          ? 1
          : 0;
  } else if (phase === "ball_flight" && opponentShot) {
    const diveTarget = state.match.lockedKeeperTarget;
    if (diveTarget) {
      isDiving = true;
      diveAmount = ballT * ballT;
      const targetY = diveTarget.y + 40;
      x = KEEPER_ANCHOR.x + (diveTarget.x - KEEPER_ANCHOR.x) * diveAmount;
      y = KEEPER_ANCHOR.y + (targetY - KEEPER_ANCHOR.y) * diveAmount;
      diveDir =
        diveTarget.x < KEEPER_ANCHOR.x - 20
          ? -1
          : diveTarget.x > KEEPER_ANCHOR.x + 20
            ? 1
            : 0;
    }
  }

  const team = isPlayerKeeper ? state.playerTeam : state.opponentTeam;
  const kit = kitFromTeam(
    team?.primaryColor ?? "#2a7a1e",
    team?.secondaryColor ?? "#ffffff",
    team?.shortColor ?? "#102040"
  );

  const pose = resolveKeeperPose(
    diveDir,
    isDiving,
    diveAmount,
    lastKickResult,
    phase
  );

  drawGoalkeeperCharacter(ctx, {
    x,
    y,
    scale: 1.15,
    kit,
    pose,
    animTime: keeper.timer,
    diveDir,
    diveAmount,
  });
}

function drawKicker(ctx: CanvasRenderingContext2D, state: GameState) {
  const { kicker, phase } = state.match;
  const isOpponentKicker =
    phase === "opponent_run_up" ||
    phase === "defending" ||
    phase === "keeper_dive" ||
    (phase === "ball_flight" && state.match.opponentShot);

  const team = isOpponentKicker ? state.opponentTeam : state.playerTeam;
  const kit = kitFromTeam(
    team?.primaryColor ?? "#cc0000",
    team?.secondaryColor ?? "#003399",
    team?.shortColor ?? "#082e55"
  );

  const pose = isOpponentKicker
    ? phase === "opponent_run_up"
      ? "runup"
      : "idle"
    : resolveKickerPose(state);

  drawKickerCharacter(ctx, {
    x: KICKER_ANCHOR.x,
    y: KICKER_ANCHOR.y,
    scale: 1.25,
    kit,
    pose,
    animTime: kicker.timer,
  });
}

function drawAimArrow(
  ctx: CanvasRenderingContext2D,
  aimX: number,
  opacity = 1
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#a4cb3f";
  ctx.beginPath();
  ctx.moveTo(aimX, 695);
  ctx.lineTo(aimX + 26, 724);
  ctx.lineTo(aimX + 13, 724);
  ctx.lineTo(aimX + 13, 771);
  ctx.lineTo(aimX - 12, 771);
  ctx.lineTo(aimX - 12, 724);
  ctx.lineTo(aimX - 25, 724);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, state: GameState) {
  const { ball } = state.match;
  if (!ball.visible) return;

  const r = 17.5 * ball.scale;
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.spin);

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = "#d8d8d8";
  ctx.fill();
  ctx.strokeStyle = "#777777";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "#555555";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0);
  ctx.lineTo(r * 0.4, 0);
  ctx.stroke();

  ctx.restore();
}

function drawGreenTarget(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  locked: boolean
) {
  const green = locked ? "#8fb535" : "#a4cb3f";
  const markerDist = 24;
  const triSize = 9;

  ctx.save();

  ctx.fillStyle = green;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;

  const directions = [
    { dx: 0, dy: -1, rot: 0 },
    { dx: 1, dy: 0, rot: Math.PI / 2 },
    { dx: 0, dy: 1, rot: Math.PI },
    { dx: -1, dy: 0, rot: -Math.PI / 2 },
  ];

  for (const dir of directions) {
    const cx = x + dir.dx * markerDist;
    const cy = y + dir.dy * markerDist;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir.rot);
    ctx.beginPath();
    ctx.moveTo(0, -triSize);
    ctx.lineTo(triSize * 0.75, triSize * 0.5);
    ctx.lineTo(-triSize * 0.75, triSize * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!locked) {
    ctx.strokeStyle = "rgba(164, 203, 63, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRedHint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  const pulse = 0.85 + Math.sin(Date.now() / 120) * 0.15;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = "#ff2222";
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawResultText(ctx: CanvasRenderingContext2D, text: string) {
  ctx.save();
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = text === "GOAL!" ? "#00ff2f" : text === "SAVED!" ? "#f2ea00" : "#ff4444";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 6;
  ctx.strokeText(text, 813, 380);
  ctx.fillText(text, 813, 380);
  ctx.restore();
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const t of state.floatingTexts) {
    const alpha = t.life / t.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${48 * t.scale}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = t.color;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.strokeText(t.text, t.x, t.y - (1 - alpha) * 40);
    ctx.fillText(t.text, t.x, t.y - (1 - alpha) * 40);
    ctx.restore();
  }
}

function drawPenaltySpot(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(786, 964, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawInstruction(ctx: CanvasRenderingContext2D, state: GameState) {
  const { phase, shootingState } = state.match;
  let text = "";
  if (phase === "aiming") {
    if (shootingState === "aiming_before_first_click") {
      text = "Click to lock fake target";
    } else if (shootingState === "fake_target_locked") {
      text = "Click again to shoot — or wait for auto-save";
    }
  } else if (phase === "defending" || phase === "keeper_dive") {
    const { defendState, greenTargetLocked } = state.match;
    if (defendState === "red_hint_visible") {
      text = "Remember where the ball will go!";
    } else if (!greenTargetLocked) {
      text = "Place your save — click to lock position";
    } else {
      text = "Save position locked — get ready!";
    }
  }
  if (!text) return;

  ctx.font = "600 24px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 4;
  ctx.strokeText(text, 813, 1150);
  ctx.fillText(text, 813, 1150);
}

function drawTeamSelect(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#0c082d";
  ctx.fillRect(0, 0, w, h);
  ctx.font = "bold 48px system-ui, sans-serif";
  ctx.fillStyle = "#f2ea00";
  ctx.textAlign = "center";
  ctx.fillText("Penalty Fever", w / 2, 80);
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Select your team", w / 2, 130);
}

function drawBracketScreen(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number) {
  ctx.fillStyle = "#0c082d";
  ctx.fillRect(0, 0, w, h);
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.fillStyle = "#f2ea00";
  ctx.textAlign = "center";
  ctx.fillText("Tournament Bracket", w / 2, 60);

  const match = state.bracket.find((m) => m.playerWon === null);
  if (match) {
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillStyle = "#00ff2f";
    ctx.fillText(STAGE_LABELS[match.stage], w / 2, 110);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(
      `${state.playerTeam?.name ?? "?"} vs ${match.opponentTeam.name}`,
      w / 2,
      160
    );
  }

  let y = 220;
  for (const m of state.bracket) {
    const label = STAGE_LABELS[m.stage];
    const result =
      m.playerWon === null ? "—" : m.playerWon ? "W" : "L";
    ctx.font = "20px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle =
      m.playerWon === null ? "#f2ea00" : m.playerWon ? "#00ff2f" : "#ff4444";
    ctx.fillText(`${label}: vs ${m.opponentTeam.name} [${result}]`, w / 2 - 200, y);
    y += 36;
  }
}

export function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  containerW: number,
  containerH: number
) {
  const scale = getRenderScale(containerW, containerH);
  const renderedW = SCENE_WIDTH * scale;
  const renderedH = SCENE_HEIGHT * scale;
  const offsetX = (containerW - renderedW) / 2;
  const offsetY = (containerH - renderedH) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, containerW, containerH);

  if (state.screen === "team_select") {
    drawTeamSelect(ctx, containerW, containerH);
    return;
  }

  if (state.screen === "bracket" || state.screen === "match_result" || state.screen === "tournament_won") {
    if (state.screen === "bracket") {
      drawBracketScreen(ctx, state, containerW, containerH);
      return;
    }
    drawBracketScreen(ctx, state, containerW, containerH);
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    if (state.screen === "tournament_won") {
      ctx.fillStyle = "#00ff2f";
      ctx.fillText("🏆 TOURNAMENT CHAMPION! 🏆", containerW / 2, containerH - 80);
    } else {
      ctx.fillStyle = "#ff4444";
      ctx.fillText("Eliminated — Try Again", containerW / 2, containerH - 80);
    }
    return;
  }

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawCrowd(ctx);
  drawAdBoards(ctx);
  drawPitch(ctx);
  drawGoalNet(ctx);
  drawGoalFrame(ctx);
  drawFieldLines(ctx);
  drawPenaltySpot(ctx);

  drawGoalkeeper(ctx, state);
  drawKicker(ctx, state);

  if (
    state.match.phase === "aiming" &&
    state.shootout.isPlayerTurn &&
    (state.match.shootingState === "aiming_before_first_click" ||
      state.match.shootingState === "fake_target_locked")
  ) {
    if (state.match.ghostArrowVisible && state.match.fakeTargetArrowX !== null) {
      drawAimArrow(ctx, state.match.fakeTargetArrowX, 0.4);
    }
    drawAimArrow(ctx, state.match.aimArrowX, 1);
  }

  if (
    state.match.phase === "defending" ||
    state.match.phase === "keeper_dive"
  ) {
    drawGreenTarget(
      ctx,
      state.match.greenTargetPosition.x,
      state.match.greenTargetPosition.y,
      state.match.greenTargetLocked
    );

    if (
      state.match.redHintVisible &&
      state.match.opponentShot?.isOnTarget
    ) {
      drawRedHint(
        ctx,
        state.match.opponentShot.targetX,
        state.match.opponentShot.targetY
      );
    }
  }

  drawBall(ctx, state);
  drawHud(ctx, state);

  if (state.match.resultText) {
    drawResultText(ctx, state.match.resultText);
  }

  drawFloatingTexts(ctx, state);
  drawInstruction(ctx, state);

  ctx.restore();
}

export function getTeamSelectHitboxes(
  containerW: number,
  containerH: number
): { teamIndex: number; x: number; y: number; w: number; h: number }[] {
  const cols = 4;
  const rows = 4;
  const pad = 20;
  const startY = 180;
  const cellW = (containerW - pad * 2) / cols;
  const cellH = 70;
  const boxes: { teamIndex: number; x: number; y: number; w: number; h: number }[] = [];

  for (let i = 0; i < 16; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    boxes.push({
      teamIndex: i,
      x: pad + col * cellW,
      y: startY + row * cellH,
      w: cellW - 8,
      h: cellH - 8,
    });
  }
  return boxes;
}

export function drawTeamSelectOverlay(
  ctx: CanvasRenderingContext2D,
  containerW: number,
  containerH: number,
  teams: { name: string; primaryColor: string }[],
  hoverIndex: number | null
) {
  drawTeamSelect(ctx, containerW, containerH);
  const boxes = getTeamSelectHitboxes(containerW, containerH);

  boxes.forEach((box, i) => {
    const team = teams[i];
    if (!team) return;
    const hovered = hoverIndex === i;
    ctx.fillStyle = hovered ? team.primaryColor : "rgba(255,255,255,0.1)";
    roundRect(ctx, box.x, box.y, box.w, box.h, 10);
    ctx.fill();
    ctx.strokeStyle = hovered ? "#f2ea00" : "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "600 18px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(team.name, box.x + box.w / 2, box.y + box.h / 2 + 6);
  });
}

export function getBracketPlayButton(
  containerW: number,
  containerH: number
): { x: number; y: number; w: number; h: number } {
  return {
    x: containerW / 2 - 120,
    y: containerH - 160,
    w: 240,
    h: 56,
  };
}

export function drawBracketPlayButton(
  ctx: CanvasRenderingContext2D,
  containerW: number,
  containerH: number
) {
  const btn = getBracketPlayButton(containerW, containerH);
  ctx.fillStyle = "#00ff2f";
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 28);
  ctx.fill();
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillStyle = "#0c082d";
  ctx.textAlign = "center";
  ctx.fillText("Play Match", btn.x + btn.w / 2, btn.y + btn.h / 2 + 8);
}

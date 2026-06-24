import { STAGE_LABELS, STAGE_ORDER, TEAMS } from "./constants";
import type { BracketMatch, Team, TournamentStage } from "./types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createBracket(playerTeam: Team): BracketMatch[] {
  const others = shuffle(TEAMS.filter((t) => t.id !== playerTeam.id));
  const matches: BracketMatch[] = [];

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    matches.push({
      id: `match-${i}`,
      playerTeam: i === 0 ? playerTeam : null,
      opponentTeam: others[i % others.length],
      stage: STAGE_ORDER[i],
      playerWon: null,
    });
  }
  return matches;
}

export function currentMatch(bracket: BracketMatch[]): BracketMatch | null {
  return bracket.find((m) => m.playerWon === null) ?? null;
}

export function advanceBracket(
  bracket: BracketMatch[],
  playerWon: boolean
): BracketMatch[] {
  const idx = bracket.findIndex((m) => m.playerWon === null);
  if (idx === -1) return bracket;

  const updated = bracket.map((m, i) =>
    i === idx ? { ...m, playerWon } : m
  );

  if (playerWon && idx + 1 < updated.length) {
    updated[idx + 1] = {
      ...updated[idx + 1],
      playerTeam: updated[idx].playerTeam,
    };
  }

  return updated;
}

export function isTournamentComplete(bracket: BracketMatch[]): boolean {
  const final = bracket[bracket.length - 1];
  return final.playerWon !== null;
}

export function tournamentWon(bracket: BracketMatch[]): boolean {
  const final = bracket[bracket.length - 1];
  return final.playerWon === true;
}

export function stageLabel(stage: TournamentStage): string {
  return STAGE_LABELS[stage];
}

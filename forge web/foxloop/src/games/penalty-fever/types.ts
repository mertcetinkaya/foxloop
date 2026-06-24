export interface Vec2 {
  x: number;
  y: number;
}

export type GoalZone =
  | "top_left"
  | "top_center"
  | "top_right"
  | "middle_left"
  | "middle_center"
  | "middle_right"
  | "low_left"
  | "low_center"
  | "low_right";

export type ShotHeight = "low" | "mid" | "high";

export type TournamentStage =
  | "round_of_16"
  | "round_of_8"
  | "quarter_final"
  | "semi_final"
  | "final";

export interface Team {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  shortColor: string;
}

export interface ShootoutState {
  round: number;
  playerKicksTaken: number;
  opponentKicksTaken: number;
  playerScore: number;
  opponentScore: number;
  maxRegularKicks: number;
  suddenDeath: boolean;
  isPlayerTurn: boolean;
  winner: "player" | "opponent" | null;
}

export interface ShotData {
  targetX: number;
  targetY: number;
  power: number;
  height: ShotHeight;
  zone: GoalZone | "miss";
  isOnTarget: boolean;
  canBeSaved: boolean;
}

export type ShootingState =
  | "aiming_before_first_click"
  | "fake_target_locked"
  | "shot_resolving"
  | "shot_finished";

export type GameScreen =
  | "team_select"
  | "bracket"
  | "match"
  | "match_result"
  | "tournament_won";

export type DefendState =
  | "defend_init"
  | "green_target_active"
  | "red_hint_visible"
  | "memory_adjust_window"
  | "keeper_target_locked"
  | "shot_resolving"
  | "shot_finished";

export type MatchPhase =
  | "idle"
  | "aiming"
  | "kick"
  | "ball_flight"
  | "resolve_shot"
  | "opponent_run_up"
  | "defending"
  | "keeper_dive"
  | "resolve_save"
  | "turn_transition"
  | "shootout_end";

export type KickResult = "goal" | "saved" | "miss";

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface BallState {
  x: number;
  y: number;
  scale: number;
  spin: number;
  visible: boolean;
}

export interface KickerAnim {
  phase: "idle" | "runup" | "kick" | "celebrate" | "miss";
  frame: number;
  timer: number;
}

export interface KeeperAnim {
  phase: "idle" | "dive" | "celebrate" | "concede";
  diveZone: GoalZone | null;
  frame: number;
  timer: number;
}

export interface MatchState {
  phase: MatchPhase;
  shootingState: ShootingState;
  aimArrowX: number;
  aimDirection: number;
  fakeTarget: Vec2 | null;
  realTarget: Vec2 | null;
  fakeTargetArrowX: number | null;
  ghostArrowVisible: boolean;
  firstClickTime: number | null;
  hasArrowLeftFakeZone: boolean;
  forcedSave: boolean;
  pendingKickResult: KickResult | null;
  currentShot: ShotData | null;
  lastKickResult: KickResult | null;
  ball: BallState;
  ballT: number;
  kicker: KickerAnim;
  keeper: KeeperAnim;
  defendState: DefendState | null;
  greenTargetPosition: Vec2;
  lockedKeeperTarget: Vec2 | null;
  greenTargetLocked: boolean;
  redHintVisible: boolean;
  opponentShot: ShotData | null;
  phaseTimer: number;
  resultText: string | null;
  resultTextTimer: number;
}

export interface BracketMatch {
  id: string;
  playerTeam: Team | null;
  opponentTeam: Team;
  stage: TournamentStage;
  playerWon: boolean | null;
}

export interface GameState {
  screen: GameScreen;
  playerTeam: Team | null;
  opponentTeam: Team | null;
  stage: TournamentStage;
  bracket: BracketMatch[];
  shootout: ShootoutState;
  match: MatchState;
  floatingTexts: FloatingText[];
  difficulty: number;
  now: number;
}

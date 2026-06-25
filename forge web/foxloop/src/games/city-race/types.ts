export type GameStatus = "playing" | "won" | "lost";

export interface TrafficCar {
  id: number;
  lane: number;
  z: number;
  speed: number;
  color: string;
}

export interface GameState {
  status: GameStatus;
  lane: number;
  laneX: number;
  speed: number;
  displaySpeed: number;
  nitro: number;
  nitroActive: boolean;
  braking: boolean;
  racing: boolean;
  distance: number;
  score: number;
  shake: number;
  traffic: TrafficCar[];
  nextTrafficId: number;
  roadScroll: number;
  keys: Record<string, boolean>;
  steerLeft: boolean;
  steerRight: boolean;
}

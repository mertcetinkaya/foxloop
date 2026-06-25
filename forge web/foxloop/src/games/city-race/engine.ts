import {
  BASE_SPEED,
  LANE_OFFSETS,
  MAX_SPEED,
  NITRO_DRAIN,
  NITRO_MULT,
  NITRO_RECHARGE,
  TRAFFIC_COLORS,
  WIN_DISTANCE,
  clamp,
} from "./constants";
import type { GameState } from "./types";

const LANE_SPREAD = 0.22;

export function createInitialState(): GameState {
  return {
    status: "playing",
    lane: 0,
    laneX: 0,
    speed: BASE_SPEED,
    displaySpeed: 0,
    nitro: 1,
    nitroActive: false,
    braking: false,
    racing: true,
    distance: 0,
    score: 0,
    shake: 0,
    traffic: [],
    nextTrafficId: 1,
    roadScroll: 0,
    keys: {},
    steerLeft: false,
    steerRight: false,
  };
}

export function restartLevel(state: GameState): void {
  Object.assign(state, createInitialState());
}

export function setPointer(state: GameState, _x: number, _y: number): void {
  void state;
}

export function onPointerDown(state: GameState, x: number, y: number): void {
  void x;
  void y;
  state.racing = true;
}

export function onPointerUp(state: GameState, _x: number, _y: number): void {
  void _x;
  void _y;
  state.racing = false;
  state.braking = false;
}

export function onKey(state: GameState, key: string, down: boolean): void {
  state.keys[key] = down;
  if (key === "ArrowLeft" || key === "a") state.steerLeft = down;
  if (key === "ArrowRight" || key === "d") state.steerRight = down;
  if (key === " " || key === "ArrowUp") state.racing = down;
  if (key === "ArrowDown" || key === "s") state.braking = down;
}

function spawnTraffic(state: GameState): void {
  const lane = LANE_OFFSETS[Math.floor(Math.random() * LANE_OFFSETS.length)];
  const color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
  state.traffic.push({
    id: state.nextTrafficId++,
    lane,
    z: 1.05 + Math.random() * 0.35,
    speed: 0.55 + Math.random() * 0.25,
    color,
  });
}

export function updateGame(state: GameState, dt: number) {
  if (state.status !== "playing") return;
  dt = Math.min(dt, 0.05);

  if (state.steerLeft || state.keys.ArrowLeft || state.keys.a) {
    state.laneX = clamp(state.laneX - 2.4 * dt, -1, 1);
  }
  if (state.steerRight || state.keys.ArrowRight || state.keys.d) {
    state.laneX = clamp(state.laneX + 2.4 * dt, -1, 1);
  }
  state.steerLeft = false;
  state.steerRight = false;
  state.lane = Math.round(state.laneX);

  let targetSpeed = BASE_SPEED;
  if (state.racing || state.keys.ArrowUp) targetSpeed = MAX_SPEED;
  if (state.braking || state.keys.ArrowDown) targetSpeed = BASE_SPEED * 0.45;

  if (state.nitroActive && state.nitro > 0.05) {
    targetSpeed = MAX_SPEED * NITRO_MULT;
    state.nitro = Math.max(0, state.nitro - NITRO_DRAIN * dt);
  } else {
    state.nitroActive = false;
    state.nitro = Math.min(1, state.nitro + NITRO_RECHARGE * dt);
  }

  state.speed += (targetSpeed - state.speed) * 4 * dt;
  state.displaySpeed = state.speed * 0.28;
  state.distance += state.speed * dt * 0.12;
  state.score = Math.floor(state.distance);
  state.roadScroll = (state.roadScroll + state.speed * dt * 0.8) % 10000;

  if (state.traffic.length < 6 && Math.random() < dt * 1.8) {
    spawnTraffic(state);
  }

  for (const car of state.traffic) {
    car.z -= (state.speed / MAX_SPEED) * 0.55 * dt * car.speed;
  }
  state.traffic = state.traffic.filter((c) => c.z > -0.05);

  const playerZ = 0.12;
  const hitR = 0.09;
  for (const car of state.traffic) {
    if (car.z < 0.28 && car.z > 0.02) {
      const dx = Math.abs(state.laneX - car.lane);
      if (dx < hitR) {
        state.status = "lost";
        state.shake = 0.6;
        state.speed *= 0.2;
        break;
      }
    }
  }

  if (state.distance >= WIN_DISTANCE) {
    state.status = "won";
  }

  if (state.shake > 0) state.shake -= dt;
}

export function activateNitro(state: GameState): void {
  if (state.nitro > 0.15 && state.status === "playing") {
    state.nitroActive = true;
  }
}

export function setSteerLeft(state: GameState, active: boolean): void {
  state.steerLeft = active;
}

export function setSteerRight(state: GameState, active: boolean): void {
  state.steerRight = active;
}

export function setBraking(state: GameState, active: boolean): void {
  state.braking = active;
}

export function setRacing(state: GameState, active: boolean): void {
  state.racing = active;
}

export { LANE_SPREAD };

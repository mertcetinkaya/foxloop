export interface CharacterKit {
  shirt: string;
  shirtSecondary?: string;
  shorts: string;
  socks: string;
  boots: string;
  skin: string;
  hair: string;
  outline: string;
}

export type KickerPose =
  | "idle"
  | "preparing"
  | "runup"
  | "kick"
  | "followThrough"
  | "celebrate"
  | "miss";

export type KeeperPose =
  | "idle"
  | "crouch"
  | "diveLeft"
  | "diveRight"
  | "diveCenter"
  | "save"
  | "concede";

export interface DrawCharacterOptions {
  x: number;
  y: number;
  scale: number;
  kit: CharacterKit;
  /** Seconds elapsed in current pose (for cyclic animation) */
  animTime: number;
}

export interface KickerDrawOptions extends DrawCharacterOptions {
  pose: KickerPose;
}

export interface KeeperDrawOptions extends DrawCharacterOptions {
  pose: KeeperPose;
  /** -1 left, 0 center, 1 right — used for dive direction */
  diveDir: number;
  /** 0–1 dive extension amount */
  diveAmount: number;
}

export function kitFromTeam(
  primary: string,
  secondary: string | undefined,
  shorts: string
): CharacterKit {
  return {
    shirt: primary,
    shirtSecondary: secondary ?? primary,
    shorts,
    socks: "#ffffff",
    boots: "#1a1a1a",
    skin: "#e8b88a",
    hair: "#2a1810",
    outline: "#141414",
  };
}

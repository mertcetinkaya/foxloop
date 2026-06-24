import levelJson from "./levels/level1.json";
import type { ArrowDefinition, LevelData } from "./types";

export const LEVEL_1: LevelData = levelJson as LevelData;

export const GRID_WIDTH = LEVEL_1.grid.width;
export const GRID_HEIGHT = LEVEL_1.grid.height;
export const LEVEL_1_ARROWS: ArrowDefinition[] = LEVEL_1.arrows;

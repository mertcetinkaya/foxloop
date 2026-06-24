/** Quick solvability check — run with: npx tsx scripts/check-arrow-level.ts */
import { canArrowExit, getArrowPath } from "../src/games/arrow-out/engine";
import { LEVEL_1 } from "../src/games/arrow-out/level1";
import type { ArrowDefinition, ArrowPiece } from "../src/games/arrow-out/types";

function toPieces(ids: string[]): ArrowPiece[] {
  return ids.map((id) => {
    const def = LEVEL_1.arrows.find((a) => a.id === id)!;
    return {
      ...def,
      head_pos: { ...def.head_pos },
      tail_path: def.tail_path.map((c) => ({ ...c })),
      removed: false,
      animationTick: 0,
    };
  });
}

function solve(ids: string[], depth = 0): string[] | null {
  if (ids.length === 0) return [];
  if (depth > 90) return null;

  const arrows = toPieces(ids);
  for (const arrow of arrows) {
    if (
      canArrowExit(
        arrow,
        arrows,
        LEVEL_1.grid.width,
        LEVEL_1.grid.height
      )
    ) {
      const rest = solve(
        ids.filter((x) => x !== arrow.id),
        depth + 1
      );
      if (rest) return [arrow.id, ...rest];
    }
  }
  return null;
}

const occupied = new Map<string, string>();
for (const a of LEVEL_1.arrows) {
  for (const c of getArrowPath(a)) {
    const k = `${c.x},${c.y}`;
    if (occupied.has(k)) {
      console.error("Duplicate cell", k, occupied.get(k), a.id);
    }
    occupied.set(k, a.id);
  }
}

const ids = LEVEL_1.arrows.map((a) => a.id);
const solution = solve(ids);
console.log("Arrows:", ids.length);
console.log("Grid:", LEVEL_1.grid.width, "x", LEVEL_1.grid.height);
console.log("Solvable:", Boolean(solution));
if (solution) console.log("Solution length:", solution.length);

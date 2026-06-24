/**
 * Converts arrowout.io raw level strings into head_pos + tail_path JSON.
 * Run: npx tsx scripts/convert-arrow-level.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

type Direction = "up" | "down" | "left" | "right";

const DIR_MAP: Record<number, Direction> = {
  0: "up",
  1: "right",
  2: "down",
  3: "left",
};

function getDirection(
  from: [number, number],
  to: [number, number]
): Direction {
  const [fx, fy] = from;
  const [tx, ty] = to;
  if (fx === tx) return fy > ty ? "up" : "down";
  if (fy === ty) return fx > tx ? "left" : "right";
  throw new Error(`Non-orthogonal segment ${from} -> ${to}`);
}

function parseRawLevel(raw: string) {
  const parts = raw.replace(/^"|"$/g, "").split(";");
  if (parts.length !== 3) throw new Error("Invalid level string");
  const width = parseInt(parts[0], 10);
  const height = parseInt(parts[1], 10);
  const pathStrings = parts[2].split("|");

  const arrows = pathStrings
    .filter((s) => s.length > 0)
    .map((pathStr, index) => {
      const path: [number, number][] = pathStr.split(",").map((encoded) => {
        const n = parseInt(encoded, 10);
        return [n % width, Math.floor(n / width)] as [number, number];
      });

      if (path.length < 2) {
        throw new Error(`Arrow ${index} has fewer than 2 points`);
      }

      const head = path[path.length - 1];
      const prev = path[path.length - 2];
      const direction = getDirection(prev, head);
      const tail_path = path
        .slice(0, -1)
        .reverse()
        .map(([x, y]) => ({ x, y }));

      return {
        id: String(index + 1).padStart(3, "0"),
        head_pos: { x: head[0], y: head[1] },
        direction,
        tail_path,
      };
    });

  return { grid: { width, height }, arrows };
}

function validateArrow(arrow: ReturnType<typeof parseRawLevel>["arrows"][0]) {
  const { head_pos, direction, tail_path } = arrow;
  if (tail_path.length === 0) return;

  const first = tail_path[0];
  const dx = first.x - head_pos.x;
  const dy = first.y - head_pos.y;

  const behind =
    (direction === "right" && dx === -1 && dy === 0) ||
    (direction === "left" && dx === 1 && dy === 0) ||
    (direction === "up" && dx === 0 && dy === 1) ||
    (direction === "down" && dx === 0 && dy === -1);

  if (!behind) {
    throw new Error(
      `Arrow ${arrow.id}: head/tail incompatible (${direction} at ${head_pos.x},${head_pos.y})`
    );
  }

  for (let i = 0; i < tail_path.length - 1; i++) {
    const a = tail_path[i];
    const b = tail_path[i + 1];
    const segDx = Math.abs(a.x - b.x);
    const segDy = Math.abs(a.y - b.y);
    if (segDx + segDy !== 1) {
      throw new Error(`Arrow ${arrow.id}: non-adjacent tail segment`);
    }
  }

  const lastSeg = tail_path.length >= 2 ? [tail_path[1], tail_path[0]] : null;
  if (lastSeg) {
    const segDir = getDirection(
      [lastSeg[0].x, lastSeg[0].y],
      [lastSeg[1].x, lastSeg[1].y]
    );
    if (segDir !== direction) {
      // Only the segment INTO the head must match direction — inner bends can differ
    }
  }
}

const root = join(__dirname, "..");
const rawPath = join(root, "src/games/arrow-out/levels/level1.raw.json");
const outPath = join(root, "src/games/arrow-out/levels/level1.json");

const raw = JSON.parse(readFileSync(rawPath, "utf8")) as string;
const level = parseRawLevel(raw);

for (const arrow of level.arrows) {
  validateArrow(arrow);
}

const output = {
  id: "level-1",
  name: "Teddy Bear",
  ...level,
};

writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
console.log(`Wrote ${level.arrows.length} arrows (${level.grid.width}x${level.grid.height}) -> ${outPath}`);

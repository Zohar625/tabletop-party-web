import type { Board, Terrain } from "./types.ts";
import { GOALS, RUINS } from "./data.ts";
export function neighbors(i: number): number[] {
  const x = i % 11,
    y = Math.floor(i / 11);
  return [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]
    .filter(([a, b]) => a >= 0 && a < 11 && b >= 0 && b < 11)
    .map(([a, b]) => b * 11 + a);
}
const edge = (i: number) => i % 11 === 0 || i % 11 === 10 || i < 11 || i >= 110;
function clusters(board: Board, t: Terrain): number[][] {
  const seen = new Set<number>(),
    out: number[][] = [];
  board.cells.forEach((cell, i) => {
    if (cell !== t || seen.has(i)) return;
    const group = [i];
    seen.add(i);
    for (let j = 0; j < group.length; j++)
      for (const n of neighbors(group[j]))
        if (board.cells[n] === t && !seen.has(n)) {
          seen.add(n);
          group.push(n);
        }
    out.push(group);
  });
  return out;
}
export function monsterPenalty(board: Board): number {
  const empty = new Set<number>();
  board.cells.forEach((t, i) => {
    if (t === "monster")
      for (const n of neighbors(i)) if (board.cells[n] === null) empty.add(n);
  });
  return empty.size;
}
export function scoreBoard(board: Board, goalId: string): number {
  const c = board.cells;
  const count = (predicate: (i: number) => boolean) =>
    c.reduce<number>((n, _, i) => n + Number(predicate(i)), 0);
  const adjacent = (i: number, t: Terrain) =>
    neighbors(i).some((n) => c[n] === t);
  const enclosed = (i: number) => neighbors(i).every((n) => c[n] !== null);
  switch (goalId) {
    case "sentinel":
      return count((i) => c[i] === "forest" && edge(i));
    case "treetower":
      return count((i) => c[i] === "forest" && enclosed(i));
    case "greenbough": {
      const rows = new Set<number>(),
        cols = new Set<number>();
      c.forEach((t, i) => {
        if (t === "forest") {
          rows.add(Math.floor(i / 11));
          cols.add(i % 11);
        }
      });
      return rows.size + cols.size;
    }
    case "stoneside": {
      const mountains = new Set<number>();
      for (const group of clusters(board, "forest")) {
        const touched = new Set(
          group.flatMap(neighbors).filter((i) => c[i] === "mountain"),
        );
        if (touched.size >= 2) for (const i of touched) mountains.add(i);
      }
      return mountains.size * 3;
    }
    case "wildholds":
      return clusters(board, "village").filter((g) => g.length >= 6).length * 8;
    case "greengold":
      return (
        clusters(board, "village").filter(
          (g) =>
            new Set(
              g
                .flatMap(neighbors)
                .map((i) => c[i])
                .filter((t) => t !== null && t !== "village"),
            ).size >= 3,
        ).length * 3
      );
    case "greatcity":
      return Math.max(
        0,
        ...clusters(board, "village")
          .filter((g) => !g.some((i) => adjacent(i, "mountain")))
          .map((g) => g.length),
      );
    case "shieldgate":
      return (
        (clusters(board, "village")
          .map((g) => g.length)
          .sort((a, b) => b - a)[1] ?? 0) * 2
      );
    case "canal":
      return count(
        (i) =>
          (c[i] === "farm" && adjacent(i, "water")) ||
          (c[i] === "water" && adjacent(i, "farm")),
      );
    case "granary": {
      const ruins = new Set(RUINS.map(([x, y]) => y * 11 + x));
      return (
        count(
          (i) => c[i] === "water" && neighbors(i).some((n) => ruins.has(n)),
        ) +
        count((i) => c[i] === "farm" && ruins.has(i)) * 3
      );
    }
    case "mages":
      return (
        count((i) => c[i] === "water" && adjacent(i, "mountain")) * 2 +
        count((i) => c[i] === "farm" && adjacent(i, "mountain"))
      );
    case "shoreside":
      return (["farm", "water"] as const).reduce(
        (n, t) =>
          n +
          clusters(board, t).filter(
            (g) =>
              !g.some(
                (i) => edge(i) || adjacent(i, t === "farm" ? "water" : "farm"),
              ),
          ).length *
            3,
        0,
      );
    case "borderlands": {
      let score = 0;
      for (let v = 0; v < 11; v++) {
        if (Array.from({ length: 11 }, (_, x) => c[v * 11 + x]).every(Boolean))
          score += 6;
        if (Array.from({ length: 11 }, (_, y) => c[y * 11 + v]).every(Boolean))
          score += 6;
      }
      return score;
    }
    case "brokenroad": {
      let score = 0;
      for (let start = 0; start < 11; start++) {
        let full = true;
        for (let x = 0, y = start; y < 11; x++, y++)
          if (c[y * 11 + x] === null) full = false;
        if (full) score += 3;
      }
      return score;
    }
    case "barony": {
      const dp = Array(121).fill(0);
      let largest = 0;
      for (let y = 0; y < 11; y++)
        for (let x = 0; x < 11; x++) {
          const i = y * 11 + x;
          if (c[i] !== null) {
            dp[i] =
              1 + (x && y ? Math.min(dp[i - 1], dp[i - 11], dp[i - 12]) : 0);
            largest = Math.max(largest, dp[i]);
          }
        }
      return largest * 3;
    }
    case "cauldrons":
      return count((i) => c[i] === null && enclosed(i));
    default:
      throw new Error("未知计分目标：" + goalId);
  }
}
export function soloRating(
  total: number,
  goals: string[],
): { score: number; title: string } {
  const score =
    total -
    goals.reduce((n, id) => {
      const goal = GOALS.find((g) => g.id === id);
      if (!goal) throw new Error("未知计分目标");
      return n + goal.base;
    }, 0);
  const levels: [number, string][] = [
    [30, "传奇制图师"],
    [20, "地图大师"],
    [10, "熟练地形师"],
    [0, "见习测绘员"],
    [-5, "业余评估员"],
    [-10, "笨拙助手"],
    [-20, "糊涂涂鸦者"],
    [-Infinity, "迷糊墨水客"],
  ];
  return { score, title: levels.find(([minimum]) => score >= minimum)![1] };
}
/** Grid indices belonging to the scored spaces/clusters, for the goal overlay. */
export function goalHighlights(board: Board, goalId: string): number[] {
  const c = board.cells,
    all = c.map((_, i) => i),
    adjacent = (i: number, t: Terrain) => neighbors(i).some((n) => c[n] === t),
    enclosed = (i: number) => neighbors(i).every((n) => c[n] !== null);
  let result: number[] = [];
  switch (goalId) {
    case "sentinel":
      result = all.filter((i) => c[i] === "forest" && edge(i));
      break;
    case "treetower":
      result = all.filter((i) => c[i] === "forest" && enclosed(i));
      break;
    case "greenbough":
      result = all.filter((i) => c[i] === "forest");
      break;
    case "stoneside":
      for (const g of clusters(board, "forest")) {
        const mountains = [
          ...new Set(g.flatMap(neighbors).filter((i) => c[i] === "mountain")),
        ];
        if (mountains.length >= 2) result.push(...g, ...mountains);
      }
      break;
    case "wildholds":
      result = clusters(board, "village")
        .filter((g) => g.length >= 6)
        .flat();
      break;
    case "greengold":
      result = clusters(board, "village")
        .filter(
          (g) =>
            new Set(
              g
                .flatMap(neighbors)
                .map((i) => c[i])
                .filter((t) => t !== null && t !== "village"),
            ).size >= 3,
        )
        .flat();
      break;
    case "greatcity":
      result =
        clusters(board, "village")
          .filter((g) => !g.some((i) => adjacent(i, "mountain")))
          .sort((a, b) => b.length - a.length)[0] ?? [];
      break;
    case "shieldgate":
      result =
        clusters(board, "village").sort((a, b) => b.length - a.length)[1] ?? [];
      break;
    case "canal":
      result = all.filter(
        (i) =>
          (c[i] === "farm" && adjacent(i, "water")) ||
          (c[i] === "water" && adjacent(i, "farm")),
      );
      break;
    case "granary": {
      const ruins = new Set(RUINS.map(([x, y]) => y * 11 + x));
      result = all.filter(
        (i) =>
          (c[i] === "water" && neighbors(i).some((n) => ruins.has(n))) ||
          (c[i] === "farm" && ruins.has(i)),
      );
      break;
    }
    case "mages":
      result = all.filter(
        (i) => (c[i] === "water" || c[i] === "farm") && adjacent(i, "mountain"),
      );
      break;
    case "shoreside":
      result = (["farm", "water"] as const).flatMap((t) =>
        clusters(board, t)
          .filter(
            (g) =>
              !g.some(
                (i) => edge(i) || adjacent(i, t === "farm" ? "water" : "farm"),
              ),
          )
          .flat(),
      );
      break;
    case "borderlands":
      for (let v = 0; v < 11; v++) {
        const row = Array.from({ length: 11 }, (_, x) => v * 11 + x),
          column = Array.from({ length: 11 }, (_, y) => y * 11 + v);
        if (row.every((i) => c[i] !== null)) result.push(...row);
        if (column.every((i) => c[i] !== null)) result.push(...column);
      }
      break;
    case "brokenroad":
      for (let start = 0; start < 11; start++) {
        const line = Array.from(
          { length: 11 - start },
          (_, x) => (start + x) * 11 + x,
        );
        if (line.every((i) => c[i] !== null)) result.push(...line);
      }
      break;
    case "barony": {
      const size = scoreBoard(board, goalId) / 3;
      find: for (let y = 0; y <= 11 - size; y++)
        for (let x = 0; x <= 11 - size; x++) {
          const square = Array.from(
            { length: size * size },
            (_, i) => (y + Math.floor(i / size)) * 11 + x + (i % size),
          );
          if (square.every((i) => c[i] !== null)) {
            result = square;
            break find;
          }
        }
      break;
    }
    case "cauldrons":
      result = all.filter((i) => c[i] === null && enclosed(i));
      break;
    default:
      throw new Error("未知计分目标");
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

import type {
  MapGame,
  MapPlayer,
  Placement,
  Point,
  Terrain,
  ExploreCard,
} from "./types.ts";
import { GOALS, CARDS } from "./data.ts";
export const SAVE_KEY = "tabletop.cartographers.solo.v1";
export const HISTORY_KEY = "tabletop.cartographers.history.v1";
export const SEASONS = ["春日", "盛夏", "金秋", "寒冬"];
export const LIMITS = [8, 8, 7, 6];
export function fullBoardPlacement(kind: ExploreCard["kind"]): Placement {
  return {
    shape: 0,
    terrain: kind === "ambush" ? "monster" : "forest",
    x: -1,
    y: -1,
    rotation: 0,
    mirrored: false,
    fallback: true,
  };
}
export function canOpenRoom(hasRoom: boolean, restoring: boolean) {
  return !hasRoom && !restoring;
}
export function winners(players: MapPlayer[]): MapPlayer[] {
  const best = Math.max(...players.map((p) => scoreTotal(p.seasons)));
  const tied = players.filter((p) => scoreTotal(p.seasons) === best);
  const fewest = Math.min(
    ...tied.map((p) => p.seasons.reduce((n, s) => n + s.monsters, 0)),
  );
  return tied.filter(
    (p) => p.seasons.reduce((n, s) => n + s.monsters, 0) === fewest,
  );
}
export function terrainName(terrain: Terrain | null) {
  return terrain
    ? {
        forest: "森林",
        village: "村庄",
        farm: "农田",
        water: "水域",
        monster: "怪物",
        mountain: "山峰",
        wasteland: "荒地",
      }[terrain]
    : "空地";
}
export function scoreTotal(seasons: { total: number }[]) {
  return seasons.reduce((sum, s) => sum + s.total, 0);
}
export function previewCells(shape: Point[], x: number, y: number): Point[] {
  return shape.map(([dx, dy]) => [x + dx, y + dy]);
}
export function readSavedGame(value: string | null): MapGame | null {
  try {
    const g = JSON.parse(value || "null");
    const terrains = [
      "forest",
      "village",
      "farm",
      "water",
      "monster",
      "mountain",
      "wasteland",
      null,
    ];
    if (
      !g ||
      g.version !== 1 ||
      g.mode !== "solo" ||
      !Array.isArray(g.players) ||
      g.players.length !== 1 ||
      !Array.isArray(g.players[0]?.board?.cells) ||
      g.players[0].board.cells.length !== 121 ||
      !g.players[0].board.cells.every((c: unknown) =>
        terrains.includes(c as Terrain),
      ) ||
      !Array.isArray(g.players[0].seasons) ||
      g.players[0].id !== "solo" ||
      typeof g.players[0].name !== "string" ||
      !Number.isFinite(g.players[0].board.coins) ||
      !Array.isArray(g.players[0].board.earnedMountains) ||
      !g.players[0].seasons.every(
        (s: Record<string, unknown>) =>
          s &&
          Number.isFinite(s.total) &&
          Array.isArray(s.goals) &&
          s.goals.length === 2 &&
          s.goals.every(Number.isFinite),
      ) ||
      !Array.isArray(g.deck) ||
      !Array.isArray(g.ambushDeck) ||
      ![...g.deck, ...g.ambushDeck].every((id) =>
        CARDS.some((c) => c.id === id),
      ) ||
      !Array.isArray(g.goals) ||
      g.goals.length !== 4 ||
      !g.goals.every((id: unknown) => GOALS.some((v) => v.id === id)) ||
      !Number.isInteger(g.season) ||
      g.season < 0 ||
      g.season > 3 ||
      !["placing", "seasonEnd", "finished"].includes(g.phase) ||
      !Array.isArray(g.current?.shapes) ||
      g.current.shapes.length === 0 ||
      !g.current.shapes.every(
        (s: { cells: unknown }) =>
          Array.isArray(s.cells) &&
          s.cells.length > 0 &&
          s.cells.every(
            (p: unknown) =>
              Array.isArray(p) && p.length === 2 && p.every(Number.isInteger),
          ),
      ) ||
      !Array.isArray(g.current?.terrains) ||
      g.current.terrains.length === 0 ||
      !g.current.terrains.every((t: unknown) =>
        terrains.slice(0, 5).includes(t as Terrain),
      ) ||
      !Number.isFinite(g.elapsed) ||
      !Number.isInteger(g.turn) ||
      typeof g.seed !== "string"
    )
      return null;
    return g as MapGame;
  } catch {
    return null;
  }
}

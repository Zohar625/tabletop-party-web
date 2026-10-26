import type { Board, MapView, Placement } from "./types.ts";
import { placementError, targetPlayer, transformedShape } from "./engine.ts";
import { monsterPenalty, neighbors, scoreBoard } from "./scoring.ts";
import { SEASONS } from "./data.ts";

export function nextCommissionSeason(
  season: number,
  index: number,
): number | null {
  for (let s = season + 1; s < 4; s++)
    if ((SEASONS[s].goals as readonly number[]).includes(index)) return s;
  return null;
}
export interface PlacementPreview {
  valid: boolean;
  error: string | null;
  board: Board;
  goals: { id: string; before: number; after: number; delta: number }[];
  coinDelta: number;
  monsterDelta: number;
}
/** Project only this ink onto a copy. Never reveal a future card or settle a season. */
export function previewPlacement(
  game: MapView,
  actor: string,
  placement: Placement,
): PlacementPreview {
  const error = placementError(game, actor, placement);
  const original = targetPlayer(game, actor).board,
    board = structuredClone(original);
  if (
    !error &&
    !(placement.fallback && placement.x === -1 && placement.y === -1)
  ) {
    const cells = placement.fallback
      ? [[0, 0]]
      : transformedShape(
          game.current.shapes[placement.shape].cells,
          placement.rotation,
          placement.mirrored,
        );
    for (const [dx, dy] of cells)
      board.cells[(placement.y + dy) * 11 + placement.x + dx] =
        placement.terrain;
    if (!placement.fallback && game.current.shapes[placement.shape].coin)
      board.coins = Math.min(14, board.coins + 1);
    board.cells.forEach((t, i) => {
      if (
        t === "mountain" &&
        !board.earnedMountains.includes(i) &&
        neighbors(i).every((n) => board.cells[n] !== null)
      ) {
        board.earnedMountains.push(i);
        board.coins = Math.min(14, board.coins + 1);
      }
    });
  }
  return {
    valid: !error,
    error,
    board,
    goals: game.goals.map((id) => {
      const before = scoreBoard(original, id),
        after = scoreBoard(board, id);
      return { id, before, after, delta: after - before };
    }),
    coinDelta: board.coins - original.coins,
    monsterDelta: monsterPenalty(board) - monsterPenalty(original),
  };
}

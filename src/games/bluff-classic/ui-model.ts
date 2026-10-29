import type { ClassicView } from "./types.ts";
export const roleNames = {
  thinker: "想想",
  truth: "老实人",
  bluffer: "瞎掰人",
};
export function readingLeft(game: ClassicView, now: number): number {
  return game.phase === "reading" && game.readingDeadline !== null
    ? Math.max(0, Math.ceil((game.readingDeadline - now) / 1000))
    : 0;
}
export function calibratedNow(localNow: number, localMinusHost: number) {
  return localNow - localMinusHost;
}
export function visibleAnswer(game: ClassicView, now: number): string | null {
  return game.me.role === "truth" && readingLeft(game, now) > 0
    ? game.me.answer
    : null;
}
export function rankings(
  players: { id: string; name: string; score: number }[],
) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return sorted.map((p) => ({
    ...p,
    rank: 1 + sorted.filter((other) => other.score > p.score).length,
  }));
}

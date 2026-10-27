import { canBeat, classifySet } from "./engine.ts";
import type { ScoutCard, ScoutEvent, ScoutView } from "./types.ts";
export type Selection = { anchor: number; end: number } | null;
export function chooseRange(current: Selection, index: number): Selection {
  if (!current || current.anchor !== current.end)
    return { anchor: index, end: index };
  return current.anchor === index ? null : { ...current, end: index };
}
export const rangeOf = (selection: Selection) =>
  selection
    ? {
        start: Math.min(selection.anchor, selection.end),
        count: Math.abs(selection.end - selection.anchor) + 1,
      }
    : null;
export const selectionKey = (game: ScoutView) =>
  JSON.stringify([
    game.matchId,
    game.round,
    game.phase,
    game.turnId,
    game.me.id,
    game.me.hand.map((c) => [c.id, c.top, c.bottom]),
  ]);
export const flipHand = (hand: ScoutCard[]) =>
  [...hand].reverse().map((c) => ({ ...c, top: c.bottom, bottom: c.top }));
export function previewInsert(
  hand: ScoutCard[],
  card: ScoutCard,
  flip: boolean,
  gap: number,
) {
  return [
    ...hand.slice(0, gap),
    flip ? { ...card, top: card.bottom, bottom: card.top } : { ...card },
    ...hand.slice(gap),
  ];
}
export function describeSet(cards: ScoutCard[]) {
  const set = classifySet(cards);
  if (!set) return "未组成组合";
  return `${set.count} 张${set.kind === "same" ? "同点数" : set.kind === "run" ? "顺子" : "单牌"} · 最小点数 ${set.min}`;
}
export function selectionMessage(
  cards: ScoutCard[],
  active: ScoutCard[] | null,
) {
  if (!cards.length) return "先选起点，再选终点；中间的牌会一起选中。";
  if (!classifySet(cards))
    return "这些牌不是同点数或连续顺子。不能跳过中间的牌。";
  if (!canBeat(cards, active))
    return "组合还不够强：先比张数，再比同点数 / 顺子，最后比最小点数。";
  return `可以演出 · ${describeSet(cards)}`;
}
export type EventCursor = { matchId: string; seq: number };
export function unreadEvents(
  cursor: EventCursor | null,
  matchId: string,
  seq: number,
  events: ScoutEvent[],
) {
  return {
    cursor: {
      matchId,
      seq: cursor?.matchId === matchId ? Math.max(seq, cursor.seq) : seq,
    },
    events: cursor
      ? events.filter((e) => cursor.matchId !== matchId || e.seq > cursor.seq)
      : [],
  };
}
export const roomStatusText = (status: string) =>
  ({
    connecting: "正在连接房间",
    online: "房间已连接",
    waiting: "等待房主连接",
    offline: "连接已断开，正在重连",
    closed: "房间已关闭",
  })[status] ?? "正在同步";

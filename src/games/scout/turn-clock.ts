import { canBeat } from "./engine.ts";
import type { ScoutAction, ScoutState } from "./types.ts";
export interface TurnClock {
  key: string;
  actorId: string;
  seconds: number;
  deadline: number;
  stage: 0 | 1;
}
export interface TimeoutNotice {
  id: string;
  text: string;
}
export const validTurnLimit = (seconds: unknown): seconds is number =>
  typeof seconds === "number" &&
  Number.isInteger(seconds) &&
  (seconds === 0 || (seconds >= 5 && seconds <= 300));
export function readTurnClock(value: unknown): TurnClock | null {
  if (!value || typeof value !== "object") return null;
  const c = value as TurnClock;
  return typeof c.key === "string" &&
    c.key.length < 240 &&
    typeof c.actorId === "string" &&
    validTurnLimit(c.seconds) &&
    c.seconds > 0 &&
    Number.isFinite(c.deadline) &&
    (c.stage === 0 || c.stage === 1)
    ? structuredClone(c)
    : null;
}
export function makeTurnClock(
  game: ScoutState | null,
  seconds: number,
  now: number,
): TurnClock | null {
  if (!game || game.phase !== "playing" || !seconds) return null;
  return {
    key: `${game.matchId}:${game.round}:${game.revision}:${game.turnId}`,
    actorId: game.turnId,
    seconds,
    deadline: now + seconds * 1000,
    stage: 0,
  };
}
export function turnClockView(clock: TurnClock, now: number) {
  const remaining = Math.max(0, Math.ceil((clock.deadline - now) / 1000));
  return {
    remaining,
    urgent: remaining <= Math.min(10, Math.ceil(clock.seconds / 3)),
    progress: Math.max(
      0,
      Math.min(1, (clock.deadline - now) / (clock.seconds * 1000)),
    ),
  };
}
export function automaticAction(game: ScoutState): ScoutAction | null {
  if (game.phase !== "playing") return null;
  const player = game.players.find((p) => p.id === game.turnId)!;
  for (let count = 1; count <= player.hand.length; count++)
    for (let start = 0; start + count <= player.hand.length; start++)
      if (
        canBeat(
          player.hand.slice(start, start + count),
          game.active?.cards ?? null,
        )
      )
        return { type: "show", start, count };
  if (
    !game.comboActorId &&
    game.active?.cards.length &&
    (game.players.length > 2 || player.scoutChips > 0)
  )
    return {
      type: "scout",
      side: "left",
      flip: false,
      insertIndex: player.hand.length,
      combo: false,
    };
  return null;
}

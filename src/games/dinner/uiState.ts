import type { DinnerPhase, DinnerView, DishCard } from "./types";

export function selectableDishes(game: DinnerView): DishCard[] {
  if (game.phase === "discard") {
    return game.challenger === game.me.id && game.turn === game.me.id
      ? game.me.allCards
      : [];
  }
  return game.phase === "initial" || game.phase === "placing"
    ? game.me.hand
    : [];
}

export function retainDishSelection(
  selected: string | null,
  previousPhase: DinnerPhase | undefined,
  game: DinnerView | null | undefined,
): string | null {
  if (!game || game.phase !== previousPhase) return null;
  return selectableDishes(game).some((card) => card.id === selected)
    ? selected
    : null;
}

export type DishTransitions = { placed: string[]; revealed: string[] };

/** Do not replay old actions when joining, restoring, or catching up on history. */
export function dishTransitions(
  previous: DinnerView | null | undefined,
  next: DinnerView | null | undefined,
): DishTransitions {
  const empty = { placed: [], revealed: [] };
  if (
    !previous ||
    !next ||
    previous.me.id !== next.me.id ||
    previous.round !== next.round ||
    next.revision !== previous.revision + 1
  )
    return empty;
  return {
    placed: next.players
      .filter((player) => {
        const before = previous.players.find((p) => p.id === player.id);
        return before && player.stackCount > before.stackCount;
      })
      .map((player) => player.id),
    revealed: next.revealed
      .filter(
        (reveal) =>
          !previous.revealed.some((old) => old.card.id === reveal.card.id),
      )
      .map((reveal) => reveal.card.id),
  };
}

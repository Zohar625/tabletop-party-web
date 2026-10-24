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

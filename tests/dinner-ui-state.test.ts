import test from "node:test";
import assert from "node:assert/strict";
import {
  createDinner,
  dinnerView,
  reduceDinner,
} from "../src/games/dinner/engine.ts";
import {
  retainDishSelection,
  selectableDishes,
} from "../src/games/dinner/uiState.ts";

const fresh = () =>
  createDinner(
    ["a", "b", "c"].map((id) => ({ id, name: id })),
    () => 0.5,
  );

test("another player's initial submission keeps my selected dish", () => {
  const state = fresh();
  const selected = dinnerView(state, "c").me.hand[0].id;
  const next = reduceDinner(state, "b", {
    type: "place",
    cardId: state.players[1].cards[0].id,
  });
  assert.equal(
    retainDishSelection(selected, "initial", dinnerView(next, "c")),
    selected,
  );
});

test("a submitted dish is cleared and cannot be selected from the hand again", () => {
  const state = fresh();
  const selected = state.players[1].cards[0].id;
  const view = dinnerView(
    reduceDinner(state, "b", { type: "place", cardId: selected }),
    "b",
  );
  assert.equal(retainDishSelection(selected, "initial", view), null);
  assert.equal(
    selectableDishes(view).some((card) => card.id === selected),
    false,
  );
  assert.equal(view.me.placed[0].id, selected);
});

test("changing phase clears a selection even when the card remains in hand", () => {
  const view = dinnerView(fresh(), "b");
  assert.equal(retainDishSelection(view.me.hand[0].id, "placing", view), null);
});

test("discard choices include table cards only for the challenger on their turn", () => {
  const state = fresh();
  const next = reduceDinner(state, "b", {
    type: "place",
    cardId: state.players[1].cards[0].id,
  });
  next.phase = "discard";
  next.challenger = "b";
  next.turn = "b";
  assert.equal(selectableDishes(dinnerView(next, "b")).length, 4);
  assert.deepEqual(selectableDishes(dinnerView(next, "c")), []);
  next.turn = "c";
  assert.deepEqual(selectableDishes(dinnerView(next, "b")), []);
});

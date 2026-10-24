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

// A fresh revision animates once; restored snapshots and skipped history stay still.
test("dish transitions animate only fresh committed placements and reveals", async () => {
  const { dishTransitions } = await import("../src/games/dinner/uiState.ts");
  const before = dinnerView(fresh(), "b");
  const after = structuredClone(before);
  after.revision++;
  after.players[2].stackCount++;
  assert.deepEqual(dishTransitions(before, after), {
    placed: ["c"],
    revealed: [],
  });
  after.players[2].stackCount--;
  after.revealed.push({
    owner: "c",
    card: { id: "public", name: "蛋炒饭", kind: "safe" },
  });
  assert.deepEqual(dishTransitions(before, after), {
    placed: [],
    revealed: ["public"],
  });
  assert.deepEqual(dishTransitions(undefined, after), {
    placed: [],
    revealed: [],
  });
  assert.deepEqual(dishTransitions(after, after), { placed: [], revealed: [] });
  after.revision++;
  assert.deepEqual(dishTransitions(before, after), {
    placed: [],
    revealed: [],
  });
  after.revision = before.revision + 1;
  after.round++;
  assert.deepEqual(dishTransitions(before, after), {
    placed: [],
    revealed: [],
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  createDinner,
  reduceDinner,
  dinnerView,
} from "../src/games/dinner/engine.ts";
import type { DinnerState, DinnerAction } from "../src/games/dinner/types.ts";
const players = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase() }));
const fresh = () => createDinner(players, () => 0.5);
const act = (s: DinnerState, id: string, a: DinnerAction, r = () => 0) =>
  reduceDinner(s, id, a, r);
const card = (s: DinnerState, id: string, kind = "safe") =>
  s.players.find((p) => p.id === id)!.cards.find((c) => c.kind === kind)!;
function ready(kinds: Record<string, string> = {}) {
  let s = fresh();
  for (const id of ["b", "c", "a"])
    s = act(s, id, {
      type: "place",
      cardId: card(s, id, kinds[id] ?? "safe").id,
    });
  return s;
}
function reveal(s: DinnerState, amount = 1) {
  s = act(s, "a", { type: "bid", amount });
  if (s.phase === "bidding") {
    while (s.phase === "bidding") s = act(s, s.turn, { type: "pass" });
  }
  return s;
}
test("create validates seats and deals fixed three safe / one bad menus", () => {
  assert.throws(() => createDinner(players.slice(0, 2)), /3/);
  assert.throws(() => createDinner([...players, players[0]!]), /重复/);
  const s = fresh();
  assert.equal(s.phase, "initial");
  assert.equal(s.round, 1);
  for (const p of s.players) {
    assert.equal(p.cards.length, 4);
    assert.equal(p.cards.filter((c) => c.kind === "safe").length, 3);
  }
  assert.equal(
    new Set(s.players.flatMap((p) => p.cards.map((c) => c.id))).size,
    12,
  );
});
test("initial placement allows other seats in parallel but starter must place last", () => {
  let s = fresh();
  assert.throws(
    () => act(s, "a", { type: "place", cardId: card(s, "a").id }),
    /最后/,
  );
  s = act(s, "c", { type: "place", cardId: card(s, "c").id });
  assert.throws(() => act(s, "c", { type: "place", cardId: card(s, "c").id }));
  s = act(s, "b", { type: "place", cardId: card(s, "b").id });
  s = act(s, "a", { type: "place", cardId: card(s, "a").id });
  assert.equal(s.phase, "placing");
  assert.equal(s.turn, "a");
});
test("placement is clockwise and does not mutate original state", () => {
  const s = ready(),
    before = JSON.stringify(s);
  const id = s.players[0]!.cards.filter((c) => c.kind === "safe")[1]!.id;
  const next = act(s, "a", { type: "place", cardId: id });
  assert.equal(next.turn, "b");
  assert.equal(next.revision, s.revision + 1);
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => act(next, "a", { type: "bid", amount: 1 }), /回合/);
});
test("bidding requires higher integers and passed seats never reenter", () => {
  let s = act(ready(), "a", { type: "bid", amount: 1 });
  assert.throws(() => act(s, "b", { type: "bid", amount: 1 }));
  s = act(s, "b", { type: "pass" });
  s = act(s, "c", { type: "bid", amount: 2 });
  assert.equal(s.turn, "a");
  assert.throws(() => act(s, "b", { type: "bid", amount: 3 }));
  s = act(s, "a", { type: "pass" });
  assert.equal(s.phase, "revealing");
  assert.equal(s.challenger, "c");
});
test("maximum bid permits choosing any player while preserving top-of-stack order", () => {
  let s = act(ready(), "a", { type: "bid", amount: 3 });
  assert.equal(s.phase, "revealing");
  s = act(s, "a", { type: "flip", owner: "a" });
  s = act(s, "a", { type: "flip", owner: "c" });
  s = act(s, "a", { type: "flip", owner: "b" });
  assert.equal(s.phase, "roundEnd");
  assert.equal(s.players[0]!.wins, 1);
});
test("success ends exactly at bid and next round does not reveal unflipped dishes", () => {
  let s = reveal(ready());
  s = act(s, "a", { type: "flip", owner: "a" });
  assert.equal(s.phase, "roundEnd");
  assert.equal(s.revealed.length, 1);
  const names = s.players.map((p) => p.cards.map((c) => c.name));
  s = act(s, "b", { type: "next" });
  assert.equal(s.round, 2);
  assert.equal(s.phase, "initial");
  assert.equal(s.revealed.length, 0);
  assert.deepEqual(
    s.players.map((p) => p.cards.map((c) => c.name)),
    names,
  );
});
test("own bad asks for a private discard from placed or unplaced cards", () => {
  let s = reveal(ready({ a: "bad" }));
  s = act(s, "a", { type: "flip", owner: "a" });
  assert.equal(s.phase, "discard");
  assert.throws(() =>
    act(s, "b", { type: "discard", cardId: card(s, "a").id }),
  );
  const lost = card(s, "a").id;
  s = act(s, "a", { type: "discard", cardId: lost });
  assert.equal(s.phase, "roundEnd");
  assert.equal(s.players[0]!.cards.length, 3);
  assert(!s.players[0]!.cards.some((c) => c.id === lost));
  assert(!JSON.stringify(dinnerView(s, "b")).includes(lost));
});
test("someone else bad randomly removes challenger card with injected RNG", () => {
  let s = reveal(ready({ b: "bad" }), 2);
  s = act(s, "a", { type: "flip", owner: "a" });
  const lost = s.players[0]!.cards[3]!.id;
  s = act(s, "a", { type: "flip", owner: "b" }, () => 0.999);
  assert.equal(s.phase, "roundEnd");
  assert(!s.players[0]!.cards.some((c) => c.id === lost));
  assert.equal(s.starter, "a");
});
test("view reveals only actual flipped cards and own dishes", () => {
  const s = ready(),
    view = dinnerView(s, "b");
  assert.equal(view.me.hand.length, 3);
  assert.equal(view.me.placed.length, 1);
  assert(!("cards" in view.players[0]!));
  assert(!("stack" in view.players[0]!));
  assert.equal(view.revealed.length, 0);
  const forbidden = s.players
    .filter((p) => p.id !== "b")
    .flatMap((p) => p.cards.map((c) => c.id));
  for (const id of forbidden) assert(!JSON.stringify(view).includes(id));
});
test("two successes finish the game and prevent further actions", () => {
  let s = ready();
  s.players[0]!.wins = 1;
  s = reveal(s);
  s = act(s, "a", { type: "flip", owner: "a" });
  assert.equal(s.phase, "finished");
  assert.equal(s.winner, "a");
  assert.throws(() => act(s, "a", { type: "next" }));
});
test("eliminated challenger gives starter to bad owner; self elimination chooses live starter", () => {
  let s = ready({ b: "bad" });
  s.players[0]!.cards = s.players[0]!.cards.filter((c) =>
    s.players[0]!.stack.includes(c.id),
  );
  s = reveal(s, 2);
  s = act(s, "a", { type: "flip", owner: "a" });
  s = act(s, "a", { type: "flip", owner: "b" });
  assert.equal(s.starter, "b");
  let t = ready({ a: "bad" });
  t.players[0]!.cards = t.players[0]!.cards.filter((c) =>
    t.players[0]!.stack.includes(c.id),
  );
  t = reveal(t);
  t = act(t, "a", { type: "flip", owner: "a" });
  t = act(t, "a", { type: "discard", cardId: card(t, "a", "bad").id });
  assert.equal(t.phase, "chooseStarter");
  assert.throws(() => act(t, "a", { type: "chooseStarter", playerId: "a" }));
  t = act(t, "a", { type: "chooseStarter", playerId: "c" });
  assert.equal(t.starter, "c");
  assert.equal(t.phase, "roundEnd");
});
test("last survivor wins immediately after a discard", () => {
  let s = ready({ a: "bad" });
  s.players[0]!.cards = s.players[0]!.cards.filter((c) =>
    s.players[0]!.stack.includes(c.id),
  );
  s.players[2]!.cards = [];
  s.players[2]!.stack = [];
  s = reveal(s);
  s = act(s, "a", { type: "flip", owner: "a" });
  s = act(s, "a", { type: "discard", cardId: card(s, "a", "bad").id });
  assert.equal(s.phase, "finished");
  assert.equal(s.winner, "b");
});

test("stack flips last placed first and own revealed cards remain available to discard", () => {
  let s = ready();
  const bad = card(s, "a", "bad");
  s = act(s, "a", { type: "place", cardId: bad.id });
  s = act(s, "b", { type: "bid", amount: 1 });
  s = act(s, "c", { type: "bid", amount: 2 });
  s = act(s, "a", { type: "bid", amount: 3 });
  s = act(s, "b", { type: "pass" });
  s = act(s, "c", { type: "pass" });
  s = act(s, "a", { type: "flip", owner: "a" });
  assert.equal(s.revealed[0]!.card.id, bad.id);
  assert.equal(s.phase, "discard");
  assert(dinnerView(s, "a").me.allCards.some((c) => c.id === bad.id));
  assert(!dinnerView(s, "a").me.hand.some((c) => c.id === bad.id));
  s = act(s, "a", { type: "discard", cardId: bad.id });
  assert.equal(s.players[0]!.cards.filter((c) => c.kind === "bad").length, 0);
});
test("invalid bids and actions preserve original state and revisions", () => {
  const s = ready();
  const before = JSON.stringify(s);
  for (const amount of [0, -1, 1.5, NaN, Infinity, 4])
    assert.throws(() => act(s, "a", { type: "bid", amount }));
  assert.throws(() => act(s, "a", { type: "pass" }));
  assert.throws(() => act(s, "a", { type: "flip", owner: "a" }));
  assert.throws(() => act(s, "unknown", { type: "next" }));
  assert.equal(JSON.stringify(s), before);
});
test("private views are detached and do not expose unflipped cards at round end", () => {
  let s = reveal(ready());
  s = act(s, "a", { type: "flip", owner: "a" });
  const v = dinnerView(s, "b");
  v.me.hand[0]!.name = "changed";
  v.revealed[0]!.card.name = "changed";
  assert(!JSON.stringify(s).includes("changed"));
  const a = dinnerView(s, "a");
  for (const p of s.players.filter((p) => p.id !== "a"))
    for (const c of p.cards) assert(!JSON.stringify(a).includes(c.id));
});

test("observer cannot distinguish discarding an unflipped stack card from an unplaced card", () => {
  let s = ready();
  const bottom = s.players[0]!.stack[0]!;
  const unplaced = s.players[0]!.cards.find(
    (c) => c.kind === "safe" && c.id !== bottom,
  )!.id;
  s = act(s, "a", { type: "place", cardId: card(s, "a", "bad").id });
  s = act(s, "b", { type: "bid", amount: 1 });
  s = act(s, "c", { type: "pass" });
  s = act(s, "a", { type: "bid", amount: 2 });
  s = act(s, "b", { type: "pass" });
  s = act(s, "a", { type: "flip", owner: "a" });
  const discardBottom = act(s, "a", { type: "discard", cardId: bottom });
  const discardUnplaced = act(s, "a", { type: "discard", cardId: unplaced });
  assert.deepEqual(
    dinnerView(discardBottom, "b"),
    dinnerView(discardUnplaced, "b"),
  );
  assert.equal(discardBottom.revealed.length, 1);
  assert.equal(discardBottom.revealed[0]!.card.kind, "bad");
});

test("failure takes back every stack before private discard without revealing hidden dishes", () => {
  let s = ready();
  s = act(s, "a", { type: "place", cardId: card(s, "a", "bad").id });
  s = act(s, "b", { type: "bid", amount: 1 });
  s = act(s, "c", { type: "pass" });
  s = act(s, "a", { type: "bid", amount: 2 });
  s = act(s, "b", { type: "pass" });
  s = act(s, "a", { type: "flip", owner: "a" });
  assert.equal(s.phase, "discard");
  assert(s.players.every((p) => p.stack.length === 0));
  assert(dinnerView(s, "b").players.every((p) => p.stackCount === 0));
  assert.equal(dinnerView(s, "a").me.allCards.length, 4);
  assert.equal(s.revealed.length, 1);
  assert.equal(s.revealed[0]!.card.kind, "bad");
});

test("success takes back unflipped stacks even when the second win finishes the game", () => {
  for (const wins of [0, 1]) {
    let s = ready();
    s.players[0]!.wins = wins;
    s = reveal(s);
    s = act(s, "a", { type: "flip", owner: "a" });
    assert.equal(s.phase, wins === 0 ? "roundEnd" : "finished");
    assert(s.players.every((p) => p.stack.length === 0));
    assert.equal(s.revealed.length, 1);
  }
});


test("a challenger with only a bad dish can win by revealing another player", () => {
  let s = fresh();
  s.players[0]!.cards = [card(s, "a", "bad")];
  for (const id of ["b", "c", "a"])
    s = act(s, id, { type: "place", cardId: card(s, id, id === "a" ? "bad" : "safe").id });
  s = reveal(s);
  s = act(s, "a", { type: "flip", owner: "b" });
  assert.equal(s.phase, "roundEnd");
  assert.equal(s.players[0]!.wins, 1);
  assert.equal(s.revealed[0]!.owner, "b");
  assert.equal(s.players[0]!.cards[0]!.kind, "bad");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  readingLeft,
  visibleAnswer,
  rankings,
  calibratedNow,
} from "../src/games/bluff-classic/ui-model.ts";
import type { ClassicView } from "../src/games/bluff-classic/types.ts";
test("guest clock skew is subtracted in both directions", () => {
  assert.equal(calibratedNow(69000, 60000), 9000);
  assert.equal(calibratedNow(-51000, -60000), 9000);
});
test("classic answer hides at deadline even when host phase is delayed", () => {
  const game = {
    phase: "reading",
    readingDeadline: 10000,
    me: { role: "truth", answer: "secret" },
  } as ClassicView;
  assert.equal(visibleAnswer(game, 9999), "secret");
  assert.equal(visibleAnswer(game, 10000), null);
  assert.equal(readingLeft(game, 10001), 0);
  assert.equal(visibleAnswer({ ...game, phase: "discussion" }, 9000), null);
  assert.equal(
    visibleAnswer(
      { ...game, me: { id: "b", role: "bluffer", answer: "secret" } },
      9000,
    ),
    null,
  );
});
test("classic scoreboard shares ranks without mutating seat order", () => {
  const players = [
    { id: "a", name: "A", score: -1 },
    { id: "b", name: "B", score: 6 },
    { id: "c", name: "C", score: 6 },
  ];
  assert.deepEqual(
    rankings(players).map((p) => p.rank),
    [1, 1, 3],
  );
  assert.equal(players[0].id, "a");
});

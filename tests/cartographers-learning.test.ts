import test from "node:test";
import assert from "node:assert/strict";
import {
  previewPlacement,
  nextCommissionSeason,
} from "../src/games/cartographers/commission-model.ts";
import {
  createLearningState,
  attemptLearningPlacement,
  advanceLearning,
  lessonGame,
  learningLesson,
} from "../src/games/cartographers/tutorial-model.ts";
import { reduceGame, targetPlayer } from "../src/games/cartographers/engine.ts";
import type { Placement } from "../src/games/cartographers/types.ts";
const place = (
  x: number,
  y: number,
  extra: Partial<Placement> = {},
): Placement => ({
  x,
  y,
  shape: 0,
  terrain: "forest",
  rotation: 0,
  mirrored: false,
  ...extra,
});
test("edge forest causally adds one while interior adds zero; preview never draws or banks", () => {
  const s = createLearningState();
  const before = structuredClone(s.game);
  assert.equal(
    previewPlacement(s.game, "student", place(0, 0)).goals[0].delta,
    1,
  );
  assert.equal(
    previewPlacement(s.game, "student", place(4, 4)).goals[0].delta,
    0,
  );
  assert.equal(previewPlacement(s.game, "student", place(3, 1)).valid, false);
  assert.deepEqual(s.game, before);
  assert.throws(() => advanceLearning(s), /完成/);
  const bad = attemptLearningPlacement(s, place(4, 4));
  assert.equal(bad.done, false);
  assert.deepEqual(bad.game, s.game);
  const good = attemptLearningPlacement(s, place(0, 0));
  assert.equal(good.done, true);
  assert.equal(good.game.players[0].seasons.length, 0);
});
test("future commissions name the next real active season including A returning in winter", () => {
  assert.equal(nextCommissionSeason(0, 2), 1);
  assert.equal(nextCommissionSeason(0, 3), 2);
  assert.equal(nextCommissionSeason(1, 0), 3);
});

test("earlier accepted edge choices cannot enclose the later monster fixture with no escape", () => {
  let s = createLearningState();
  const path = [
    place(9, 0),
    place(10, 1, { rotation: 1 }),
    place(1, 0, { terrain: "village" }),
    place(4, 3),
    place(5, 1),
    place(0, 0, { fallback: true }),
    place(0, 0, { terrain: "monster" }),
  ];
  for (let i = 0; i < path.length; i++) {
    if (i === 2) s = { ...s, inspected: true };
    s = attemptLearningPlacement(s, path[i]);
    assert.equal(s.done, true, s.error);
    s = advanceLearning(s);
  }
  assert.equal(s.step, 7);
  assert.notEqual(s.practice.monster, 10);
  assert.match(
    learningLesson(s).task,
    new RegExp(
      String.fromCharCode(65 + (s.practice.monster % 11)) +
        String(Math.floor(s.practice.monster / 11) + 1),
    ),
  );
  assert.ok(
    Array.from({ length: 121 }, (_, i) =>
      place(i % 11, Math.floor(i / 11)),
    ).some((p) => attemptLearningPlacement(s, p).done),
    "monster lesson must have an actual penalty-reducing move",
  );
});

test("a village already at E4 is preserved and cannot falsely complete the mountain lesson elsewhere", () => {
  let s = createLearningState();
  for (const p of [
    place(0, 0),
    place(0, 2, { rotation: 1 }),
    place(4, 3, { terrain: "village" }),
  ]) {
    if (s.step === 2) s = { ...s, inspected: true };
    s = attemptLearningPlacement(s, p);
    assert.equal(s.done, true, s.error);
    s = advanceLearning(s);
  }
  assert.equal(s.step, 3);
  assert.equal(s.game.players[0].board.cells[37], "village");
  assert.notEqual(s.practice.gap, 37);
  assert.equal(
    attemptLearningPlacement(s, place(4, 4)).done,
    false,
    "unrelated E5 must not claim enclosure credit",
  );
  const solution = Array.from({ length: 121 }, (_, i) =>
    place(i % 11, Math.floor(i / 11)),
  ).find((p) => attemptLearningPlacement(s, p).done);
  assert.ok(solution, "mountain exercise must still be solvable");
});
test("controlled lesson path gates actual score increases and completes a real season before independent task", () => {
  let s = createLearningState();
  const path = [
    place(0, 0),
    place(0, 2, { rotation: 1 }),
    place(1, 0, { terrain: "village" }),
    place(4, 3),
    place(5, 1),
    place(0, 0, { fallback: true }),
    place(0, 0, { terrain: "monster" }),
    place(9, 0),
    place(10, 10),
    place(10, 9),
  ];
  for (let i = 0; i < path.length; i++) {
    assert.equal(s.step, i);
    if (i === 2) s = { ...s, inspected: true };
    if (i === 9) {
      const idle = attemptLearningPlacement(s, place(4, 4));
      assert.equal(
        idle.done,
        false,
        "a legal but unhelpful move cannot graduate",
      );
      assert.deepEqual(idle.game, s.game);
      assert.equal(s.game.players[0].seasons.length, 0);
    }
    s = attemptLearningPlacement(s, path[i]);
    assert.equal(s.done, true, `step ${i}: ${s.error}`);
    if (i === 6) {
      assert.equal(s.game.players[1].board.cells[0], "monster");
      assert.notEqual(s.game.players[0].board.cells[0], "monster");
    }
    if (i === 8) {
      assert.equal(s.game.phase, "seasonEnd");
      const r = s.game.players[0].seasons[0];
      assert.equal(r.total, r.goals[0] + r.goals[1] + r.coins - r.monsters);
    }
    if (i < path.length - 1) s = advanceLearning(s);
  }
  assert.equal(s.step, 9);
  assert.match(s.feedback, /声望/);
});

test("score preview matches authoritative ink including coin cap, earned mountains, ruins, fallback and neighbor monster map", () => {
  const scenarios = [
    { step: 3, placement: place(4, 3), coins: 0 },
    { step: 3, placement: place(4, 3), coins: 13 },
    { step: 3, placement: place(4, 3), coins: 14 },
    { step: 4, placement: place(5, 1), coins: 0 },
    { step: 5, placement: place(0, 0, { fallback: true }), coins: 0 },
    { step: 6, placement: place(0, 0, { terrain: "monster" }), coins: 0 },
  ];
  for (const scenario of scenarios) {
    const game = lessonGame(scenario.step);
    game.current.shapes[0].coin = true;
    targetPlayer(game, "student").board.coins = scenario.coins;
    game.elapsed = 8;
    const initial = structuredClone(game);
    const preview = previewPlacement(game, "student", scenario.placement);
    const after = reduceGame(game, "student", {
      type: "place",
      placement: scenario.placement,
    });
    assert.equal(preview.valid, true);
    assert.deepEqual(preview.board, targetPlayer(after, "student").board);
    assert.deepEqual(
      game,
      initial,
      "projection and engine both preserve input",
    );
    assert.equal(preview.board.coins <= 14, true);
    if (scenario.step === 5)
      assert.equal(preview.coinDelta, 0, "fallback cannot earn shape coin");
    if (scenario.step === 6) assert.equal(preview.monsterDelta, 2);
  }
});

test("invalid ruins and overlapping previews return the untouched board and zero deltas", () => {
  const game = lessonGame(4);
  for (const p of [place(0, 0), place(3, 1), place(11, 0)]) {
    const projected = previewPlacement(game, "student", p);
    assert.equal(projected.valid, false);
    assert.ok(projected.error);
    assert.deepEqual(projected.board, game.players[0].board);
    assert.ok(projected.goals.every((g) => g.delta === 0));
    assert.equal(projected.coinDelta, 0);
    assert.equal(projected.monsterDelta, 0);
  }
});

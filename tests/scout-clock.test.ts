import test from "node:test";
import assert from "node:assert/strict";
import * as clock from "../src/games/scout/turn-clock.ts";
import { createScout, reduceScout } from "../src/games/scout/engine.ts";
import { lessonState } from "../src/games/scout/tutorial-model.ts";

test("automatic continuation after Scout and Show must show and never scouts again", () => {
  const combo = reduceScout(lessonState(5), "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 1,
    combo: true,
  });
  const action = clock.automaticAction(combo)!;
  assert.equal(action.type, "show");
  const next = reduceScout(combo, "a", action);
  assert.equal(next.comboActorId, null);
  assert.equal(next.revision, combo.revision + 1);
});

test("turn clock starts only for play, identifies each action and exposes two-stage urgency", () => {
  assert.equal(typeof clock.makeTurnClock, "function");
  let s = createScout(
    [
      { id: "a", name: "甲" },
      { id: "b", name: "乙" },
    ],
    "clock",
  );
  assert.equal(clock.makeTurnClock(s, 15, 100000), null);
  for (const p of s.players)
    s = reduceScout(s, p.id, { type: "orient", flip: false });
  assert.equal(clock.makeTurnClock(s, 0, 100000), null);
  const first = clock.makeTurnClock(s, 15, 100000)!;
  assert.equal(first.deadline, 115000);
  assert.equal(first.stage, 0);
  assert.equal(first.actorId, s.turnId);
  assert.equal(clock.turnClockView(first, 110000).urgent, true);
  assert.equal(clock.turnClockView(first, 100000).remaining, 15);
  const later = reduceScout(s, s.turnId, clock.automaticAction(s)!);
  const next = clock.makeTurnClock(later, 15, 115000);
  if (next) assert.notEqual(next.key, first.key);
  assert.equal(
    clock.turnClockView({ ...first, stage: 1 }, 115001).remaining,
    0,
  );
});

test("automatic action completes real two-to-five-player games without changing order or using combo", () => {
  assert.equal(typeof clock.automaticAction, "function");
  for (let count = 2; count <= 5; count++)
    for (let seed = 0; seed < 3; seed++) {
      let s = createScout(
        Array.from({ length: count }, (_, i) => ({
          id: String(i),
          name: String(i),
        })),
        `automatic-${seed}`,
      );
      let steps = 0;
      while (s.phase !== "finished" && steps++ < 1200) {
        if (s.phase === "orienting") {
          for (const p of s.players)
            if (!p.orientationConfirmed)
              s = reduceScout(s, p.id, { type: "orient", flip: false });
          continue;
        }
        if (s.phase === "roundEnd") {
          s = reduceScout(s, s.players[0].id, { type: "next" });
          continue;
        }
        const original = JSON.stringify(s),
          action = clock.automaticAction(s);
        assert(action);
        assert.equal(JSON.stringify(s), original);
        if (action.type === "scout") {
          assert.equal(action.combo, false);
          assert.equal(action.flip, false);
          assert.equal(
            action.insertIndex,
            s.players.find((p) => p.id === s.turnId)!.hand.length,
          );
        }
        s = reduceScout(s, s.turnId, action);
      }
      assert.equal(s.phase, "finished");
    }
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  classifySet,
  canBeat,
  hasLegalShow,
  createScout,
  reduceScout,
  scoutView,
} from "../src/games/scout/engine.ts";
import type { ScoutState, ScoutAction } from "../src/games/scout/types.ts";

const cards = (...values: number[]) =>
  values.map((top, i) => ({ id: `c${i}`, top, bottom: 11 - top }));
const seats = ["a", "b", "c", "d", "e"].map((id) => ({
  id,
  name: id.toUpperCase(),
}));
function fixture(
  hands: number[][],
  active?: number[],
  ownerId = "c",
): ScoutState {
  const s = createScout(seats.slice(0, hands.length), "fixture");
  s.phase = "playing";
  s.starterId = s.turnId = "a";
  s.players.forEach((p, i) => {
    p.hand = cards(...hands[i]).map((c) => ({ ...c, id: `${p.id}-${c.id}` }));
    p.handCount = p.hand.length;
    p.orientationConfirmed = true;
  });
  s.active = active
    ? {
        ownerId,
        cards: cards(...active).map((c) => ({ ...c, id: `active-${c.id}` })),
      }
    : null;
  s.latestShowerId = active ? ownerId : null;
  return s;
}
const act = (s: ScoutState, id: string, action: ScoutAction) =>
  reduceScout(s, id, action);
function rejectUnchanged(s: ScoutState, id: string, action: ScoutAction) {
  const before = JSON.stringify(s);
  assert.throws(() => act(s, id, action));
  assert.equal(JSON.stringify(s), before);
}

test("set classification rejects gaps and direction changes", () => {
  assert.deepEqual(classifySet(cards(6)), { count: 1, kind: "single", min: 6 });
  assert.deepEqual(classifySet(cards(4, 4, 4)), {
    count: 3,
    kind: "same",
    min: 4,
  });
  assert.deepEqual(classifySet(cards(5, 4, 3)), {
    count: 3,
    kind: "run",
    min: 3,
  });
  assert.deepEqual(classifySet(cards(3, 4, 5)), {
    count: 3,
    kind: "run",
    min: 3,
  });
  assert.equal(classifySet(cards()), null);
  assert.equal(classifySet(cards(2, 4)), null);
  assert.equal(classifySet(cards(2, 3, 2)), null);
});

test("strength uses count then same over run then minimum and never beats a tie", () => {
  assert.equal(canBeat(cards(4, 5), cards(3, 3)), false);
  assert.equal(canBeat(cards(1, 1), cards(8, 9)), true);
  assert.equal(canBeat(cards(1, 2, 3), cards(10, 10)), true);
  assert.equal(canBeat(cards(5, 4), cards(3, 4)), true);
  assert.equal(canBeat(cards(5, 4), cards(4, 5)), false);
  assert.equal(canBeat(cards(5), cards(4)), true);
  assert.equal(canBeat(cards(5), cards(5)), false);
  assert.equal(canBeat(cards(1, 3), null), false);
});

test("legal show searches contiguous slices without rearranging cards", () => {
  assert.equal(hasLegalShow(cards(1, 3, 2), cards(7, 8)), false);
  assert.equal(hasLegalShow(cards(1, 3, 2), cards(1, 2)), true);
  assert.equal(hasLegalShow(cards(), null), false);
});

test("deals use the original deck per player count with independent orientation and a two-player reserve", () => {
  for (const [n, perHand, total, reserve] of [
    [2, 11, 44, 22],
    [3, 12, 36, 0],
    [4, 11, 44, 0],
    [5, 9, 45, 0],
  ]) {
    const s = createScout(seats.slice(0, n), "deal");
    const deck = [...s.players.flatMap((p) => p.hand), ...s.reserve];
    assert.equal(deck.length, total);
    assert.equal(
      new Set(
        deck.map((c) => [c.top, c.bottom].sort((a, b) => a - b).join("/")),
      ).size,
      total,
    );
    assert.equal(s.reserve.length, reserve);
    assert.ok(
      s.players.every(
        (p) => p.hand.length === perHand && p.scoutChips === (n === 2 ? 3 : 0),
      ),
    );
    assert.equal(s.totalRounds, n);
    assert.ok(s.players.some((p) => p.id === s.starterId));
    assert.equal(
      deck.some((c) => c.top === 10 || c.bottom === 10),
      n !== 3,
    );
    assert.equal(
      deck.some((c) => [c.top, c.bottom].sort().join() === "10,9"),
      n === 5,
    );
    assert.ok(deck.some((c) => c.top > c.bottom));
    assert.ok(deck.some((c) => c.top < c.bottom));
    assert.deepEqual(createScout(seats.slice(0, n), "deal"), s);
  }
  assert.throws(() => createScout(seats.slice(0, 1), "x"));
  assert.throws(() => createScout([seats[0], seats[0]], "x"));
});

test("orientation reverses and swaps the entire hand, locks once, and waits for everyone", () => {
  const s = fixture([
    [2, 5, 8],
    [1, 4],
    [3, 6],
  ]);
  s.phase = "orienting";
  s.players.forEach((p) => (p.orientationConfirmed = false));
  const before = JSON.stringify(s);
  let next = act(s, "a", { type: "orient", flip: true });
  assert.deepEqual(
    next.players[0].hand.map((c) => [c.id, c.top, c.bottom]),
    [
      ["a-c2", 3, 8],
      ["a-c1", 6, 5],
      ["a-c0", 9, 2],
    ],
  );
  assert.equal(JSON.stringify(s), before);
  assert.equal(next.phase, "orienting");
  rejectUnchanged(next, "a", { type: "orient", flip: false });
  next = act(next, "c", { type: "orient", flip: false });
  next = act(next, "b", { type: "orient", flip: false });
  assert.equal(next.phase, "playing");
  assert.equal(next.turnId, "a");
  assert.ok(
    next.events
      .filter((e) => e.kind === "orient" || e.kind === "deal")
      .every((e) => !e.cards),
  );
});

test("show removes only a contiguous slice, captures previous active cards and advances clockwise", () => {
  const s = fixture(
    [
      [9, 4, 5, 2],
      [1, 3],
      [6, 7],
    ],
    [2, 3],
  );
  const before = JSON.stringify(s);
  const next = act(s, "a", { type: "show", start: 1, count: 2 });
  assert.deepEqual(
    next.players[0].hand.map((c) => c.top),
    [9, 2],
  );
  assert.equal(next.players[0].captured, 2);
  assert.deepEqual(
    next.active?.cards.map((c) => c.top),
    [4, 5],
  );
  assert.equal(next.active?.ownerId, "a");
  assert.equal(next.turnId, "b");
  assert.equal(next.scoutsSinceShow, 0);
  assert.equal(next.revision, s.revision + 1);
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual(
    next.events.at(-1)?.captured?.map((c) => c.top),
    [2, 3],
  );
});

test("invalid actions reject phases, turn, malformed numbers and invalid show without mutation", () => {
  const s = fixture([[1, 3, 2], [4], [5]], [8, 9]);
  for (const action of [
    { type: "show", start: 0, count: 3 },
    { type: "show", start: -1, count: 1 },
    { type: "show", start: 0, count: 0 },
    { type: "show", start: 0.5, count: 1 },
    { type: "show", start: NaN, count: 1 },
    { type: "show", start: 0, count: Infinity },
    { type: "show", start: 3, count: 1 },
    { type: "orient", flip: true },
    { type: "next" },
  ] as ScoutAction[])
    rejectUnchanged(s, "a", action);
  rejectUnchanged(s, "b", { type: "show", start: 0, count: 1 });
  rejectUnchanged(s, "stranger", { type: "show", start: 0, count: 1 });
  const o = createScout(seats.slice(0, 3), "orient");
  rejectUnchanged(o, o.turnId, { type: "show", start: 0, count: 1 });
  rejectUnchanged(o, "a", {
    type: "orient",
    flip: 1,
  } as unknown as ScoutAction);
});

test("scout takes an end, rotates only that card and inserts in a gap with owner reward", () => {
  const s = fixture([[2, 6], [1], [4]], [3, 4, 5]);
  const next = act(s, "a", {
    type: "scout",
    side: "right",
    flip: true,
    insertIndex: 1,
    combo: false,
  });
  assert.deepEqual(
    next.players[0].hand.map((c) => c.top),
    [2, 6, 6],
  );
  assert.deepEqual(
    next.players[0].hand.map((c) => c.id),
    ["a-c0", "active-c2", "a-c1"],
  );
  assert.deepEqual(
    next.active?.cards.map((c) => c.top),
    [3, 4],
  );
  assert.equal(next.active?.ownerId, "c");
  assert.equal(next.players[2].scoutChips, 1);
  assert.equal(next.turnId, "b");
  assert.equal(next.scoutsSinceShow, 1);
  for (const insertIndex of [-1, 3, 0.5, NaN, Infinity])
    rejectUnchanged(s, "a", {
      type: "scout",
      side: "left",
      flip: false,
      insertIndex,
      combo: false,
    });
  rejectUnchanged(s, "a", {
    type: "scout",
    side: "middle",
    flip: false,
    insertIndex: 0,
    combo: false,
  } as unknown as ScoutAction);
});

test("taking the final active card still rewards its owner and allows an unrestricted next show", () => {
  let s = fixture([[7], [1, 2], [5]], [10]);
  s = act(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: false,
  });
  assert.equal(s.active, null);
  assert.equal(s.players[2].scoutChips, 1);
  rejectUnchanged(s, "b", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: false,
  });
  s = act(s, "b", { type: "show", start: 0, count: 1 });
  assert.equal(s.active?.ownerId, "b");
  assert.equal(s.scoutsSinceShow, 0);
});

test("Scout and Show consumes one use and requires the same actor to Show next", () => {
  let s = fixture([[4, 4, 8], [1, 3], [6]], [3, 4]);
  s = act(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 3,
    combo: true,
  });
  assert.equal(s.comboActorId, "a");
  assert.equal(s.turnId, "a");
  assert.equal(s.players[0].scoutShowAvailable, false);
  rejectUnchanged(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: false,
  });
  rejectUnchanged(s, "b", { type: "show", start: 0, count: 1 });
  s = act(s, "a", { type: "show", start: 0, count: 2 });
  assert.equal(s.comboActorId, null);
  assert.equal(s.turnId, "b");
  assert.equal(s.players[0].captured, 1);
  const deadEnd = fixture([[1], [2], [3]], [8, 8, 8, 8]);
  rejectUnchanged(deadEnd, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: true,
  });
  s.turnId = "a";
  rejectUnchanged(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: true,
  });
});

test("last required Scout in a combo must allow Show before the unbeaten check, including an emptied active", () => {
  for (const active of [[4, 5], [4]]) {
    let s = fixture([[6, 6, 2], [1], [7]], active, "c");
    s.scoutsSinceShow = 1;
    s = act(s, "a", {
      type: "scout",
      side: "left",
      flip: false,
      insertIndex: 3,
      combo: true,
    });
    assert.equal(s.phase, "playing");
    assert.equal(s.comboActorId, "a");
    s = act(s, "a", { type: "show", start: 0, count: 2 });
    assert.equal(s.phase, "playing");
    assert.equal(s.scoutsSinceShow, 0);
    assert.equal(s.active?.ownerId, "a");
  }
});

test("all other players scouting ends the round and exempts only the unbeaten leader", () => {
  let s = fixture([[1, 2], [3], [4, 6]], [8, 8, 8, 8]);
  s.players[0].captured = 2;
  s.players[2].captured = 3;
  s = act(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 2,
    combo: false,
  });
  s = act(s, "b", {
    type: "scout",
    side: "right",
    flip: false,
    insertIndex: 0,
    combo: false,
  });
  assert.equal(s.phase, "roundEnd");
  assert.equal(s.history[0].reason, "unbeaten");
  assert.deepEqual(
    s.history[0].lines.map((l) => [
      l.id,
      l.captured,
      l.scoutChips,
      l.remainingPenalty,
      l.delta,
      l.total,
    ]),
    [
      ["a", 2, 0, 3, -1, -1],
      ["b", 0, 0, 2, -2, -2],
      ["c", 3, 2, 0, 5, 5],
    ],
  );
  rejectUnchanged(s, "b", { type: "next" });
  const next = act(s, "a", { type: "next" });
  assert.equal(next.round, 2);
  assert.equal(next.starterId, "b");
  assert.equal(next.phase, "orienting");
  assert.deepEqual(
    next.players.map((p) => p.total),
    [-1, -2, 5],
  );
  assert.ok(
    next.players.every(
      (p) =>
        p.scoutChips === 0 &&
        p.captured === 0 &&
        !p.orientationConfirmed &&
        p.scoutShowAvailable,
    ),
  );
  assert.equal(next.active, null);
});

test("empty-hand Show ends immediately without scoring the new active group", () => {
  const s = fixture([[5, 5], [1, 2], [3]], [4]);
  const next = act(s, "a", { type: "show", start: 0, count: 2 });
  assert.equal(next.phase, "roundEnd");
  assert.equal(next.history[0].reason, "emptyHand");
  assert.deepEqual(
    next.history[0].lines.map((l) => l.delta),
    [1, -2, -1],
  );
  assert.equal(next.active?.cards.length, 2);
});

test("two-player Scout spends own chips, gives no reward and retains turn until Show", () => {
  let s = fixture(
    [
      [2, 4],
      [1, 3],
    ],
    [8, 8, 8],
    "b",
  );
  rejectUnchanged(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: true,
  });
  s = act(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 1,
    combo: false,
  });
  assert.equal(s.turnId, "a");
  assert.equal(s.players[0].scoutChips, 2);
  assert.equal(s.players[1].scoutChips, 3);
  s = act(s, "a", {
    type: "scout",
    side: "right",
    flip: false,
    insertIndex: 2,
    combo: false,
  });
  assert.deepEqual(
    s.players[0].hand.map((c) => c.top),
    [2, 8, 8, 4],
  );
  s = act(s, "a", { type: "show", start: 1, count: 2 });
  assert.equal(s.turnId, "b");
  assert.equal(s.players[0].captured, 1);
});

test("two-player zero-chip block settles and exempts latest shower, but a legal Show remains playable", () => {
  let s = fixture([[1], [2, 3]], [9, 9, 9, 9], "b");
  s.players[0].scoutChips = 1;
  s = act(s, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: false,
  });
  assert.equal(s.phase, "roundEnd");
  assert.equal(s.history[0].reason, "blocked");
  assert.deepEqual(
    s.history[0].lines.map((l) => [l.remainingPenalty, l.delta]),
    [
      [2, -2],
      [0, 3],
    ],
  );
  const playable = fixture([[5, 5], [2]], [4], "b");
  playable.players[0].scoutChips = 0;
  rejectUnchanged(playable, "a", {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 0,
    combo: false,
  });
  assert.equal(
    act(playable, "a", { type: "show", start: 0, count: 1 }).phase,
    "playing",
  );
  const afterShow = fixture(
    [
      [9, 9, 9],
      [1, 2],
    ],
    undefined,
    "a",
  );
  afterShow.players[1].scoutChips = 0;
  const end = act(afterShow, "a", { type: "show", start: 0, count: 2 });
  assert.equal(end.history[0].reason, "blocked");
  assert.equal(end.history[0].lines[0].remainingPenalty, 0);
});

test("two-player round two deals only the untouched reserve and finishes after two settlements", () => {
  let s = createScout(seats.slice(0, 2), "reserve");
  const reserveIds = new Set(s.reserve.map((c) => c.id));
  const starter = s.starterId;
  s.phase = "playing";
  s.turnId = "a";
  s.players[0].hand = cards(10);
  s.players[0].handCount = 1;
  s = act(s, "a", { type: "show", start: 0, count: 1 });
  s = act(s, "a", { type: "next" });
  assert.equal(s.starterId, starter === "a" ? "b" : "a");
  assert.ok(
    s.players.flatMap((p) => p.hand).every((c) => reserveIds.has(c.id)),
  );
  assert.equal(s.reserve.length, 0);
  assert.equal(
    new Set(s.players.flatMap((p) => p.hand.map((c) => c.id))).size,
    22,
  );
  s.phase = "playing";
  s.turnId = "a";
  s.players[0].hand = cards(10);
  s.players[0].handCount = 1;
  s = act(s, "a", { type: "show", start: 0, count: 1 });
  assert.equal(s.phase, "finished");
  assert.equal(s.history.length, 2);
  assert.equal(s.history[1].lines[0].total, 6);
  rejectUnchanged(s, "a", { type: "next" });
});

test("private views reveal only own hand and actor-only Scout placement, with no mutable references", () => {
  let s = fixture(
    [
      [2, 6],
      [1, 5],
      [3, 7],
    ],
    [4, 5],
  );
  s = act(s, "a", {
    type: "scout",
    side: "left",
    flip: true,
    insertIndex: 1,
    combo: false,
  });
  const a = scoutView(s, "a"),
    b = scoutView(s, "b");
  assert.equal(a.events.at(-1)?.insertIndex, 1);
  assert.equal(a.events.at(-1)?.flipped, true);
  assert.equal(b.events.at(-1)?.insertIndex, undefined);
  assert.equal(b.events.at(-1)?.flipped, undefined);
  assert.deepEqual(
    b.events.at(-1)?.cards?.map((c) => c.top),
    [4],
  );
  const json = JSON.stringify(b);
  assert.equal(json.includes('"seed"'), false);
  assert.equal(json.includes('"reserve"'), false);
  assert.equal(json.includes("a-c0"), false);
  assert.equal(json.includes("c-c0"), false);
  assert.equal(b.players[0].handCount, 3);
  assert.equal("hand" in b.players[0], false);
  const before = JSON.stringify(s);
  b.me.hand[0].top = 10;
  b.active!.cards[0].top = 10;
  b.players[0].total = 999;
  b.events.at(-1)!.cards![0].top = 10;
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => scoutView(s, "stranger"));
});

test("the last normal Scout can empty active while preserving the unbeaten leader and reward", () => {
  let s = fixture([[1], [2], [3, 5]], [10], "c");
  s.scoutsSinceShow = 1;
  s = act(s, "a", {
    type: "scout",
    side: "left",
    flip: true,
    insertIndex: 1,
    combo: false,
  });
  assert.equal(s.phase, "roundEnd");
  assert.equal(s.active, null);
  assert.equal(s.history[0].leaderId, "c");
  assert.deepEqual(
    s.history[0].lines.map((l) => [l.remainingPenalty, l.delta]),
    [
      [2, -2],
      [1, -1],
      [0, 1],
    ],
  );
  const before = JSON.stringify(s);
  const view = scoutView(s, "b");
  view.history[0].lines[0].total = 999;
  assert.equal(JSON.stringify(s), before);
});

test("both insertion boundaries preserve existing order and single-card Scout orientation is private", () => {
  for (const [insertIndex, expected] of [
    [0, [4, 2, 6]],
    [2, [2, 6, 4]],
  ] as const) {
    const s = fixture([[2, 6], [1], [3]], [4]);
    const before = JSON.stringify(s);
    const next = act(s, "a", {
      type: "scout",
      side: "right",
      flip: false,
      insertIndex,
      combo: false,
    });
    assert.deepEqual(
      next.players[0].hand.map((c) => c.top),
      expected,
    );
    assert.equal(JSON.stringify(s), before);
    assert.equal(scoutView(next, "b").events.at(-1)?.flipped, undefined);
  }
});

test("complete deterministic 2–5 player matches preserve cards, scoring, event bounds and round progression", () => {
  for (const count of [2, 3, 4, 5]) {
    let s = createScout(seats.slice(0, count), `complete-${count}`);
    const firstStarter = s.players.findIndex((p) => p.id === s.starterId);
    let steps = 0,
      previousSeq = s.eventSeq;
    while (s.phase !== "finished" && steps++ < 1000) {
      if (s.phase === "orienting") {
        const p = s.players.find((p) => !p.orientationConfirmed)!;
        s = act(s, p.id, { type: "orient", flip: false });
      } else if (s.phase === "roundEnd") {
        s = act(s, "a", { type: "next" });
      } else {
        const p = s.players.find((p) => p.id === s.turnId)!;
        let show: ScoutAction | null = null;
        for (let size = p.hand.length; size > 0 && !show; size--) {
          for (let start = 0; start <= p.hand.length - size; start++) {
            if (
              canBeat(
                p.hand.slice(start, start + size),
                s.active?.cards ?? null,
              )
            ) {
              show = { type: "show", start, count: size };
              break;
            }
          }
        }
        s = act(
          s,
          p.id,
          show ?? {
            type: "scout",
            side: "left",
            flip: false,
            insertIndex: 0,
            combo: false,
          },
        );
      }
      assert.ok(s.eventSeq > previousSeq);
      previousSeq = s.eventSeq;
      assert.ok(s.events.length <= 12);
      assert.ok(
        s.events.every((e, i) => i === 0 || e.seq === s.events[i - 1].seq + 1),
      );
      const inPlay = [
        ...s.players.flatMap((p) => p.hand),
        ...(s.active?.cards ?? []),
        ...s.reserve,
      ];
      assert.equal(new Set(inPlay.map((c) => c.id)).size, inPlay.length);
      assert.equal(
        inPlay.length + s.players.reduce((sum, p) => sum + p.captured, 0),
        count === 3
          ? 36
          : count === 5
            ? 45
            : count === 2 && s.round === 2
              ? 22
              : 44,
      );
      assert.ok(s.players.every((p) => p.handCount === p.hand.length));
      assert.equal(s.starterId, seats[(firstStarter + s.round - 1) % count].id);
      for (const result of s.history) {
        for (const line of result.lines)
          assert.equal(
            line.delta,
            line.captured + line.scoutChips - line.remainingPenalty,
          );
      }
      const view = scoutView(s, "a");
      assert.equal("latestShowerId" in view, false);
      assert.ok(
        view.events
          .filter((e) => e.kind === "deal" || e.kind === "orient")
          .every((e) => !e.cards && !e.captured),
      );
    }
    assert.ok(steps < 1000);
    assert.equal(s.phase, "finished");
    assert.equal(s.history.length, count);
    assert.deepEqual(
      s.players.map((p) => p.total),
      s.players.map((p) =>
        s.history.reduce(
          (sum, r) => sum + r.lines.find((l) => l.id === p.id)!.delta,
          0,
        ),
      ),
    );
    rejectUnchanged(s, "a", { type: "show", start: 0, count: 1 });
  }
});

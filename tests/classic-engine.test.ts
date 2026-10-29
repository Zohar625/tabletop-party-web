import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createClassic,
  reduceClassic,
  classicView,
} from "../src/games/bluff-classic/engine.ts";
import {
  DEFAULT_CLASSIC_SETTINGS,
  type ClassicCard,
  type ClassicState,
} from "../src/games/bluff-classic/types.ts";

const players = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `玩家${i}`,
    score: 99,
  }));
const cards: ClassicCard[] = Array.from({ length: 40 }, (_, i) => ({
  id: `q${i}`,
  conceptId: `c${i}`,
  term: `词${i}`,
  explanation: `秘密解释${i}`,
  sources: [],
  difficulty: ((i % 3) + 1) as 1 | 2 | 3,
  hints: [`方向${i}`],
}));
const create = (n = 3, seed = "classic") =>
  createClassic(players(n), cards, DEFAULT_CLASSIC_SETTINGS, seed, 1000);
function reading(state: ClassicState) {
  for (const p of state.players)
    state = reduceClassic(state, p.id, { type: "confirmRole" }, 1000);
  return reduceClassic(state, "p0", { type: "beginRead" }, 2000);
}
function discussion(state: ClassicState) {
  return reduceClassic(reading(state), "p0", { type: "finishRead" }, 11000);
}

test("initial scores, deterministic dealing, unique concepts and correct cycle counts", () => {
  for (const [n, rounds] of [
    [3, 9],
    [4, 12],
    [5, 10],
    [7, 14],
    [8, 8],
    [9, 9],
  ]) {
    const s = create(n);
    assert.equal(s.totalRounds, rounds);
    assert.ok(s.players.every((p) => p.score === 3));
    assert.notEqual(s.thinkerId, s.truthId);
    assert.deepEqual(s, create(n));
  }
  assert.throws(() => create(2));
  assert.throws(
    () =>
      createClassic(
        players(),
        cards.slice(0, 8),
        DEFAULT_CLASSIC_SETTINGS,
        "x",
        0,
      ),
    /题/,
  );
  assert.throws(
    () =>
      createClassic(
        players(),
        Array(30).fill(cards[0]),
        DEFAULT_CLASSIC_SETTINGS,
        "x",
        0,
      ),
    /题/,
  );
  assert.throws(() =>
    createClassic(
      [players()[0]!, players()[0]!, players()[2]!],
      cards,
      DEFAULT_CLASSIC_SETTINGS,
      "x",
      0,
    ),
  );
  assert.throws(() =>
    createClassic(
      players(),
      cards,
      { ...DEFAULT_CLASSIC_SETTINGS, readSeconds: 4 },
      "x",
      0,
    ),
  );
});

test("only truth receives the answer during the common reading deadline, including after restore", () => {
  const initial = create();
  const s = reading(initial);
  assert.equal(s.readingDeadline, 11000);
  for (const p of s.players) {
    const before = classicView(initial, p.id, 1000);
    assert.equal(before.me.answer, null);
    const v = classicView(s, p.id, 10999);
    assert.equal(
      v.me.answer,
      p.id === s.truthId ? s.question.explanation : null,
    );
    assert.equal(v.result, null);
    for (const key of ["truthId", "deck", "seed", "question"])
      assert.ok(!(key in v));
    assert.ok(v.players.every((other) => !("role" in other)));
    assert.equal(
      classicView(JSON.parse(JSON.stringify(s)), p.id, 11000).me.answer,
      null,
    );
  }
  assert.throws(() => classicView(s, "outsider", 2000));
  assert.throws(() => reduceClassic(s, "p0", { type: "finishRead" }, 10999));
  assert.equal(
    reduceClassic(s, "p0", { type: "finishRead" }, 11000).phase,
    "discussion",
  );
});

test("concurrent confirmations are retained and repeated confirmations are no-ops", () => {
  const s = create();
  const a = reduceClassic(s, "p0", { type: "confirmRole" }, 1000);
  const b = reduceClassic(a, "p1", { type: "confirmRole" }, 1000);
  assert.deepEqual(b.confirmations, ["p0", "p1"]);
  assert.deepEqual(reduceClassic(b, "p0", { type: "confirmRole" }, 1000), b);
  assert.deepEqual(s.confirmations, []);
  assert.throws(() => reduceClassic(b, "p0", { type: "beginRead" }, 1000));
});

test("host phase control, thinker actions and targets reject invalid actors", () => {
  const s = discussion(create());
  const nonHost = s.players.find((p) => p.id !== "p0")!.id;
  const nonThinker = s.players.find((p) => p.id !== s.thinkerId)!.id;
  assert.throws(() =>
    reduceClassic(create(), "ghost", { type: "confirmRole" }, 0),
  );
  assert.throws(() =>
    reduceClassic(reading(create()), nonHost, { type: "finishRead" }, 11000),
  );
  assert.throws(() =>
    reduceClassic(s, nonThinker, { type: "guess", target: s.truthId }, 11000),
  );
  for (const target of [s.thinkerId, "ghost"]) {
    assert.throws(() =>
      reduceClassic(s, s.thinkerId, { type: "guess", target }, 11000),
    );
    assert.throws(() =>
      reduceClassic(s, s.thinkerId, { type: "challenge", target }, 11000),
    );
  }
  assert.throws(() => reduceClassic(s, s.thinkerId, { type: "skip" }, 11000));
  assert.throws(() =>
    reduceClassic(s, "p0", { type: "unknown" } as never, 11000),
  );
});

test("challenge is deferred, limited once, and combines correct guess scoring", () => {
  const s = discussion(create());
  const bluff = s.players.find(
    (p) => p.id !== s.truthId && p.id !== s.thinkerId,
  )!.id;
  const challenged = reduceClassic(
    s,
    s.thinkerId,
    { type: "challenge", target: bluff },
    11000,
  );
  assert.ok(challenged.players.every((p) => p.score === 3));
  assert.equal(challenged.result, null);
  assert.throws(() =>
    reduceClassic(
      challenged,
      s.thinkerId,
      { type: "challenge", target: s.truthId },
      11000,
    ),
  );
  const end = reduceClassic(
    challenged,
    s.thinkerId,
    { type: "guess", target: s.truthId },
    11000,
  );
  const d = s.question.difficulty;
  assert.equal(end.players.find((p) => p.id === s.thinkerId)!.score, 4 + d);
  assert.equal(end.players.find((p) => p.id === s.truthId)!.score, 3 + d);
  assert.equal(end.players.find((p) => p.id === bluff)!.score, 2);
  assert.equal(end.result!.correct, true);
  assert.equal(classicView(end, bluff, 11000).result!.truthId, s.truthId);
  assert.throws(() =>
    reduceClassic(
      end,
      s.thinkerId,
      { type: "guess", target: s.truthId },
      11000,
    ),
  );
  assert.ok(s.players.every((p) => p.score === 3));
});

test("challenging truth costs three and wrong guess awards only selected bluffer", () => {
  let s = discussion(create());
  const bluff = s.players.find(
    (p) => p.id !== s.truthId && p.id !== s.thinkerId,
  )!.id;
  s = reduceClassic(
    s,
    s.thinkerId,
    { type: "challenge", target: s.truthId },
    11000,
  );
  const end = reduceClassic(
    s,
    s.thinkerId,
    { type: "guess", target: bluff },
    11000,
  );
  assert.equal(end.players.find((p) => p.id === s.thinkerId)!.score, 0);
  assert.equal(end.players.find((p) => p.id === s.truthId)!.score, 3);
  assert.equal(
    end.players.find((p) => p.id === bluff)!.score,
    3 + s.question.difficulty,
  );
});

test("skip consumes concept without rerolling roles or confirmations and reserves remaining rounds", () => {
  const original = create();
  const s = reduceClassic(original, "p0", { type: "confirmRole" }, 1000);
  const skipped = reduceClassic(s, s.thinkerId, { type: "skip" }, 1000);
  assert.equal(skipped.truthId, s.truthId);
  assert.equal(skipped.thinkerId, s.thinkerId);
  assert.deepEqual(skipped.confirmations, s.confirmations);
  assert.notEqual(skipped.question.conceptId, s.question.conceptId);
  assert.ok(skipped.usedConcepts.includes(s.question.conceptId));
  assert.ok(skipped.usedConcepts.includes(skipped.question.conceptId));
  const tight = createClassic(
    players(),
    cards.slice(0, 9),
    DEFAULT_CLASSIC_SETTINGS,
    "tight",
    0,
  );
  assert.throws(
    () => reduceClassic(tight, tight.thinkerId, { type: "skip" }, 0),
    /题/,
  );
});

test("full game rotates every seat equally, never repeats concepts and terminates once", () => {
  let s = create();
  const thinkers = new Map<string, number>();
  const used = new Set<string>();
  for (let round = 0; round < 9; round++) {
    assert.equal(s.roundIndex, round);
    assert.ok(!used.has(s.question.conceptId));
    used.add(s.question.conceptId);
    thinkers.set(s.thinkerId, (thinkers.get(s.thinkerId) ?? 0) + 1);
    s = discussion(s);
    s = reduceClassic(
      s,
      s.thinkerId,
      { type: "guess", target: s.truthId },
      11000,
    );
    s = reduceClassic(s, "p0", { type: "next" }, 11000);
  }
  assert.equal(s.phase, "finished");
  assert.deepEqual([...thinkers.values()], [3, 3, 3]);
  assert.throws(() => reduceClassic(s, "p0", { type: "next" }, 11000));
});

test("truth selection permits the same player on consecutive rounds", () => {
  let repeated = false;
  for (let i = 0; i < 30; i++) {
    let s = create(3, `repeat-${i}`);
    const truth = s.truthId;
    s = discussion(s);
    s = reduceClassic(
      s,
      s.thinkerId,
      { type: "guess", target: s.truthId },
      11000,
    );
    s = reduceClassic(s, "p0", { type: "next" }, 11000);
    if (s.truthId === truth) repeated = true;
  }
  assert.ok(repeated);
});

test("all three difficulties award exact points and allow negative challenge scores", () => {
  for (const difficulty of [1, 2, 3] as const) {
    const pool = cards.map((c) => ({ ...c, difficulty }));
    let s = createClassic(
      players(),
      pool,
      { ...DEFAULT_CLASSIC_SETTINGS, difficulty },
      "scoring",
      1000,
    );
    s = discussion(s);
    // A persisted score can be below three; penalties must never clamp it to zero.
    s = {
      ...s,
      players: s.players.map((p) => ({
        ...p,
        score: p.id === s.thinkerId ? 1 : 3,
      })),
    };
    const bluff = s.players.find(
      (p) => p.id !== s.thinkerId && p.id !== s.truthId,
    )!.id;
    const challenged = reduceClassic(
      s,
      s.thinkerId,
      { type: "challenge", target: s.truthId },
      11000,
    );
    const wrong = reduceClassic(
      challenged,
      s.thinkerId,
      { type: "guess", target: bluff },
      11000,
    );
    assert.equal(wrong.players.find((p) => p.id === s.thinkerId)!.score, -2);
    assert.equal(
      wrong.players.find((p) => p.id === bluff)!.score,
      3 + difficulty,
    );
    const correct = reduceClassic(
      s,
      s.thinkerId,
      { type: "guess", target: s.truthId },
      11000,
    );
    assert.equal(
      correct.players.find((p) => p.id === s.thinkerId)!.score,
      1 + difficulty,
    );
    assert.equal(
      correct.players.find((p) => p.id === s.truthId)!.score,
      3 + difficulty,
    );
    assert.equal(correct.players.find((p) => p.id === bluff)!.score, 3);
  }
});

test("returned states and views cannot mutate input cards, settings or later state", () => {
  const inputCards = structuredClone(cards);
  const settings = structuredClone(DEFAULT_CLASSIC_SETTINGS);
  const s = createClassic(players(), inputCards, settings, "immutable", 1000);
  inputCards.forEach((c) => {
    c.explanation = "overwritten";
  });
  settings.packIds.length = 0;
  assert.notEqual(s.question.explanation, "overwritten");
  assert.ok(s.settings.packIds.length);
  const v = classicView(s, "p0", 1000);
  v.players[0]!.score = -999;
  v.hints.push("mutated");
  assert.equal(s.players[0]!.score, 3);
  assert.ok(!s.question.hints.includes("mutated"));
  const next = reduceClassic(s, "p0", { type: "confirmRole" }, 1000);
  next.question.explanation = "mutated";
  assert.notEqual(s.question.explanation, "mutated");
});

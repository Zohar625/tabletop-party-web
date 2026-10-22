import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  reduceGame,
  publicView,
  privateView,
  resumeGame,
  buildQuestionPool,
} from "../src/games/bluff/engine.ts";
import type {
  Config,
  GameState,
  Question,
  ActionInput,
} from "../src/games/bluff/types.ts";
const questions: Question[] = Array.from({ length: 200 }, (_, i) => ({
  id: `q${i}`,
  conceptId: `c${i}`,
  term: `词${i}`,
  explanation: `秘密解释${i}`,
  packIds: ["a"],
  status: "verified",
  difficulty: 1,
  sources: [],
}));
const config = (n = 5): Config => ({
  playerCount: n,
  readSeconds: 10,
  selectedPackIds: ["a"],
  allowHistoryQuestions: false,
});
function act(s: GameState, input: ActionInput, now = 1000) {
  return reduceGame(
    s,
    { ...input, gameId: s.id, roundId: s.roundId, sequence: s.sequence },
    now,
  );
}
function readAll(s: GameState) {
  for (let i = 0; i < s.config.playerCount; i++) {
    s = act(s, { type: "read" });
    s = act(s, { type: "endRead" }, 11000);
  }
  return s;
}
function toVotes(s: GameState) {
  s = readAll(s);
  for (let i = 0; i < s.config.playerCount; i++)
    s = act(s, { type: "nextSpeaker" });
  return act(s, { type: "startVoting" });
}
test("3/5/9人一圈身份公平，题不重复，计分总和N-1", () => {
  for (const n of [3, 5, 9]) {
    let s = createGame(config(n), questions, 42);
    assert.equal(new Set(s.blufferSchedule).size, n);
    const used: string[] = [];
    for (let r = 0; r < n; r++) {
      used.push(...s.cards.map((q) => q.conceptId));
      s = toVotes(s);
      for (let i = 0; i < n; i++) {
        s = act(s, { type: "openVote" });
        s = act(s, {
          type: "vote",
          target:
            i === s.bluffer
              ? s.players[(i + 1) % n]!.id
              : s.players[s.bluffer]!.id,
        });
      }
      assert.equal(s.phase, "results");
      assert.equal(
        s.roundPoints.reduce((a, b) => a + b, 0),
        n - 1,
      );
      if (r < n - 1) s = act(s, { type: "nextRound" });
    }
    assert.equal(new Set(used).size, n * n);
    s = act(s, { type: "nextRound" });
    assert.equal(s.phase, "finished");
  }
});
test("交接公开视图不泄密；本人到期不可再读，恢复消耗读卡", () => {
  let s = createGame(config(), questions, 3);
  const hidden = s.cards[0]!.explanation;
  assert.ok(!JSON.stringify(publicView(s)).includes(hidden));
  assert.equal(privateView(s, s.players[0]!.id, 1000), null);
  s = act(s, { type: "read" });
  assert.ok(privateView(s, s.players[0]!.id, 1001));
  assert.equal(privateView(s, s.players[1]!.id, 1001), null);
  assert.equal(privateView(s, s.players[0]!.id, 11000), null);
  assert.throws(() => act(s, { type: "endRead" }, 1001));
  const resumed = resumeGame(s);
  assert.equal(resumed.readerIndex, 1);
  assert.equal(resumed.phase, "handoff");
  assert.ok(!JSON.stringify(publicView(s)).includes(hidden));
});
test("读完才发言，发言完才投票；自投、重放和跳阶段拒绝", () => {
  let s = createGame(config(), questions, 1);
  assert.throws(() => act(s, { type: "startVoting" }));
  s = toVotes(s);
  assert.throws(() => act(s, { type: "vote", target: s.players[1]!.id }));
  s = act(s, { type: "openVote" });
  assert.throws(() => act(s, { type: "vote", target: s.players[0]!.id }));
  const old = {
    type: "vote" as const,
    target: s.players[1]!.id,
    gameId: s.id,
    roundId: s.roundId,
    sequence: s.sequence,
  };
  s = reduceGame(s, old, 1000);
  assert.throws(() => reduceGame(s, old, 1000));
  assert.equal(publicView(s).result, undefined);
});
test("5人计分：0/2/4人投中，瞎掰人票不影响", () => {
  for (const hits of [0, 2, 4]) {
    let s = toVotes(createGame(config(), questions, 5));
    const normals = s.players.map((_, i) => i).filter((i) => i !== s.bluffer);
    for (let i = 0; i < 5; i++) {
      s = act(s, { type: "openVote" });
      const correct = normals.indexOf(i) < hits && i !== s.bluffer;
      const target = correct
        ? s.bluffer
        : s.players.findIndex((_, j) => j !== i && j !== s.bluffer);
      s = act(s, { type: "vote", target: s.players[target]!.id });
    }
    assert.equal(s.roundPoints[s.bluffer], 4 - hits);
    assert.equal(
      s.scores.reduce((a, b) => a + b, 0),
      4,
    );
    assert.equal(
      publicView(s).result!.effectiveVotes.reduce((a, b) => a + b, 0),
      4,
    );
    assert.throws(() => act(s, { type: "vote", target: s.players[0]!.id }));
  }
});
test("整轮重发不计分不重题，剩余身份保持公平；容量不足拒绝", () => {
  let s = createGame(config(), questions, 3);
  const ids = new Set(s.cards.map((q) => q.id));
  s = act(s, { type: "redeal" });
  assert.ok(s.cards.every((q) => !ids.has(q.id)));
  assert.equal(new Set(s.blufferSchedule).size, 5);
  assert.equal(
    s.scores.reduce((a, b) => a + b, 0),
    0,
  );
  assert.throws(() =>
    act(createGame(config(), questions.slice(0, 25), 3), { type: "redeal" }),
  );
  assert.throws(() => createGame(config(9), questions.slice(0, 80), 1));
});
test("题池多选去重、历史与草稿筛选，空选择拒绝", () => {
  const q = [
    ...questions.slice(0, 2),
    { ...questions[0]!, id: "duplicate", packIds: ["b"] },
    { ...questions[2]!, status: "draft" as const },
  ];
  assert.equal(buildQuestionPool(config(), q, new Set(["c0"])).length, 1);
  assert.equal(
    buildQuestionPool(
      { ...config(), selectedPackIds: ["a", "b"], allowHistoryQuestions: true },
      q,
      new Set(),
    ).length,
    2,
  );
  assert.throws(() =>
    buildQuestionPool({ ...config(), selectedPackIds: [] }, q, new Set()),
  );
  assert.equal(
    buildQuestionPool({ ...config(), selectedPackIds: ["b"] }, q, new Set())
      .length,
    1,
  );
});

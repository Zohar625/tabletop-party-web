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
test("3/5/9人玩N轮，题不重复，计分总和N-1", () => {
  for (const n of [3, 5, 9]) {
    let s = createGame(config(n), questions, 42);
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
test("整轮重发不计分不重题；容量不足拒绝", () => {
  let s = createGame(config(), questions, 3);
  const ids = new Set(s.cards.map((q) => q.id));
  s = act(s, { type: "redeal" });
  assert.ok(s.cards.every((q) => !ids.has(q.id)));
  assert.equal(
    s.scores.reduce((a, b) => a + b, 0),
    0,
  );
  assert.throws(() =>
    act(createGame(config(), questions.slice(0, 25), 3), { type: "redeal" }),
  );
  assert.throws(() => createGame(config(9), questions.slice(0, 80), 1));
});

test("题池异常不足时拒绝进入下一轮，不产生缺卡状态", () => {
  const s = createGame(config(3), questions, 5);
  const truncated = {
    ...s,
    phase: "results" as const,
    pool: s.pool.slice(0, 3),
  };
  assert.throws(() => act(truncated, { type: "nextRound" }), /题量不足/);
  assert.equal(truncated.cards.length, 3);
  assert.doesNotThrow(() => publicView(s));
});

test("同样的前两轮身份不能排除最后一轮人选，允许连续重复", () => {
  const finalChoices = new Map<string, Set<number>>();
  let repeated = false;
  for (let seed = 0; seed < 300; seed++) {
    let s = createGame(config(3), questions, seed);
    const roles = [s.bluffer];
    for (let round = 1; round < 3; round++) {
      s = act({ ...s, phase: "results" }, { type: "nextRound" });
      roles.push(s.bluffer);
    }
    repeated ||= roles[0] === roles[1] || roles[1] === roles[2];
    const key = roles.slice(0, 2).join(",");
    const options = finalChoices.get(key) ?? new Set<number>();
    options.add(roles[2]!);
    finalChoices.set(key, options);
  }
  assert.ok(repeated, "独立抽取必须允许连续两轮同一人");
  assert.equal(finalChoices.size, 9, "前两轮的九种身份组合都可以出现");
  for (const [history, choices] of finalChoices) {
    assert.equal(choices.size, 3, `历史${history}之后三人都应有机会`);
  }
});

test("下一轮和重发不受旧存档剩余身份安排约束", () => {
  let previousPlayerReturned = false;
  const redealtRoles = new Set<number>();
  for (let seed = 0; seed < 50; seed++) {
    const old = {
      ...createGame(config(3), questions, seed),
      blufferSchedule: [0, 1, 2],
      bluffer: 0,
    };
    const next = act({ ...old, phase: "results" }, { type: "nextRound" });
    previousPlayerReturned ||= next.bluffer === 0;
    const redealt = act(old, { type: "redeal" });
    redealtRoles.add(redealt.bluffer);
    assert.equal(redealt.blufferSchedule[redealt.roundIndex], redealt.bluffer);
  }
  assert.ok(previousPlayerReturned, "当过瞎掰人的玩家仍应参与下一轮抽取");
  assert.equal(redealtRoles.size, 3);
});

test("重发后进入下一轮继续推进抽取，刷新恢复不重抽", () => {
  let different = false;
  for (let seed = 0; seed < 30; seed++) {
    const original = createGame(config(3), questions, seed);
    const redealt = act(original, { type: "redeal" });
    assert.equal(resumeGame(redealt).bluffer, redealt.bluffer);
    const next = act({ ...redealt, phase: "results" }, { type: "nextRound" });
    const withoutRedeal = act(
      { ...original, phase: "results" },
      { type: "nextRound" },
    );
    different ||= next.bluffer !== withoutRedeal.bluffer;
    assert.equal(next.redeals, 1);
    assert.equal(next.blufferSchedule[0], redealt.bluffer);
  }
  assert.ok(different, "重发消耗一次抽取，跨轮应继续下一次抽取");
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

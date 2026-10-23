import test from "node:test";
import assert from "node:assert/strict";
import {
  LocalSession,
  loadSession,
  loadHistory,
  clearHistory,
} from "../src/session/localSession.ts";
import { createGame } from "../src/games/bluff/engine.ts";
import type { Question } from "../src/games/bluff/types.ts";
class Memory {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}
const pool: Question[] = Array.from({ length: 40 }, (_, i) => ({
  id: `q${i}`,
  conceptId: `c${i}`,
  term: `词${i}`,
  explanation: "真实解释",
  packIds: ["a"],
  status: "verified",
  difficulty: 1,
  sources: [],
}));
const game = () =>
  createGame(
    {
      playerCount: 3,
      readSeconds: 10,
      selectedPackIds: ["a"],
      allowHistoryQuestions: false,
    },
    pool,
    7,
  );

test("旧页面退出不能删除另一页面的新进度，当前页面可以退出", () => {
  const store = new Memory();
  const old = new LocalSession(game(), store);
  const current = loadSession(store).session!;
  current.dispatch({ type: "read" });
  const snapshot = store.getItem("tabletop.session.v1");
  assert.throws(() => old.discard(), /其他页面/);
  assert.equal(store.getItem("tabletop.session.v1"), snapshot);
  current.discard();
  assert.equal(store.getItem("tabletop.session.v1"), null);
  assert.equal(loadHistory(store).seen.size, 1);
});

test("重复身份的存档可恢复，本轮身份不因刷新改变", () => {
  const store = new Memory();
  const state = game();
  state.blufferSchedule = Array(3).fill(state.bluffer);
  store.setItem("tabletop.session.v1", JSON.stringify(state));
  const restored = loadSession(store);
  assert.ok(restored.session);
  const saved = JSON.parse(store.getItem("tabletop.session.v1")!);
  assert.equal(saved.bluffer, state.bluffer);
  assert.deepEqual(saved.blufferSchedule, state.blufferSchedule);
});

test("旧版每人一次的存档仍可恢复，已发身份和分数保持", () => {
  const store = new Memory();
  const state = game();
  state.blufferSchedule = [
    state.bluffer,
    ...[0, 1, 2].filter((i) => i !== state.bluffer),
  ];
  store.setItem("tabletop.session.v1", JSON.stringify(state));
  assert.ok(loadSession(store).session);
  const saved = JSON.parse(store.getItem("tabletop.session.v1")!);
  assert.equal(saved.bluffer, state.bluffer);
  assert.deepEqual(saved.scores, state.scores);
});
test("结构损坏的存档不会以正常对局恢复", () => {
  for (const patch of [
    { readerIndex: 3 },
    { bluffer: 9 },
    { players: [null, null, null] },
    { roundPoints: [] },
    { phase: "reading", deadline: null },
    { cursor: 500 },
    { redeals: Number.MAX_SAFE_INTEGER },
  ]) {
    const store = new Memory();
    store.setItem(
      "tabletop.session.v1",
      JSON.stringify({ ...game(), ...patch }),
    );
    const restored = loadSession(store);
    assert.equal(restored.session, null, JSON.stringify(patch));
    assert.match(restored.warning, /损坏/);
  }
});
test("仅展示交接词记历史，读卡恢复消耗一次且保留历史", () => {
  const store = new Memory();
  const s = new LocalSession(game(), store, () => 1000);
  assert.equal(loadHistory(store).seen.size, 1);
  s.dispatch({ type: "read" });
  const r = loadSession(store, () => 2000);
  assert.ok(r.session);
  assert.equal(r.session.getPublicView().readerIndex, 1);
  assert.equal(r.session.getPublicView().phase, "handoff");
  assert.equal(loadHistory(store).seen.size, 2);
  assert.equal(loadSession(store).session!.getPublicView().readerIndex, 1);
});
test("非阅读阶段完整恢复；整轮重发保留已展示词的历史", () => {
  const store = new Memory();
  let clock = 1000;
  const s = new LocalSession(game(), store, () => clock);
  const firstTerm = s.getPublicView().handoff!.term;
  s.dispatch({ type: "redeal" });
  assert.equal(loadHistory(store).seen.size, 2);
  assert.notEqual(s.getPublicView().handoff!.term, firstTerm);
  const check = () =>
    assert.deepEqual(
      loadSession(store, () => clock).session!.getPublicView(),
      s.getPublicView(),
    );
  check();
  for (let i = 0; i < 3; i++) {
    s.dispatch({ type: "read" });
    clock += 10000;
    s.dispatch({ type: "endRead" });
    check();
  }
  assert.equal(loadHistory(store).seen.size, 4);
  for (let i = 0; i < 3; i++) {
    s.dispatch({ type: "nextSpeaker" });
    check();
  }
  s.dispatch({ type: "startVoting" });
  check();
  for (let i = 0; i < 3; i++) {
    s.dispatch({ type: "openVote" });
    check();
    s.dispatch({ type: "vote", target: `p${((i + 1) % 3) + 1}` });
    check();
  }
  s.dispatch({ type: "nextRound" });
  check();
  assert.equal(s.getPublicView().roundIndex, 1);
  assert.equal(s.getPublicView().speakerId, "p2");
});
test("损坏和版本不兼容明确报错，保存失败有提示，清空失败不假报成功", () => {
  const store = new Memory();
  store.setItem("tabletop.session.v1", "{bad");
  assert.match(loadSession(store).warning, /损坏/);
  store.setItem("tabletop.session.v1", JSON.stringify({ version: 99 }));
  assert.match(loadSession(store).warning, /不兼容/);
  const broken = {
    getItem: () => null,
    setItem: () => {
      throw Error("full");
    },
    removeItem: () => {
      throw Error("full");
    },
  };
  const s = new LocalSession(game(), broken);
  assert.match(s.getWarning(), /保存/);
  s.dispatch({ type: "read" });
  s.dispatch({ type: "consumeRead" });
  assert.equal(s.getPublicView().readerIndex, 1);
  assert.throws(() => clearHistory(broken));
});

test("旧页面不能回退另一页面的读卡进度或覆盖历史", () => {
  const store = new Memory();
  const a = new LocalSession(game(), store, () => 1000);
  const b = loadSession(store, () => 1000).session!;
  a.dispatch({ type: "read" });
  a.dispatch({ type: "consumeRead" });
  const saved = store.getItem("tabletop.session.v1");
  assert.equal(loadHistory(store).seen.size, 2);
  assert.throws(() => b.dispatch({ type: "read" }), /其他页面|其它页面|刷新/);
  assert.equal(b.getPrivateView("p1"), null);
  assert.equal(store.getItem("tabletop.session.v1"), saved);
  assert.equal(loadHistory(store).seen.size, 2);
});

test("读卡被另一页面恢复消耗后，旧页面不再返回私密卡片", () => {
  const store = new Memory();
  const a = new LocalSession(game(), store, () => 1000);
  a.dispatch({ type: "read" });
  assert.ok(a.getPrivateView("p1"));
  assert.equal(
    loadSession(store, () => 1001).session!.getPublicView().readerIndex,
    1,
  );
  assert.equal(a.getPrivateView("p1"), null);
  assert.match(a.getWarning(), /其他页面|其它页面|刷新/);
});

test("新对局替换存档后旧页面不能继续写入", () => {
  const store = new Memory();
  const a = new LocalSession(game(), store);
  const replacement = game();
  replacement.id = "other-game";
  new LocalSession(replacement, store);
  assert.throws(() => a.dispatch({ type: "read" }), /其他页面|其它页面|刷新/);
  assert.equal(
    JSON.parse(store.getItem("tabletop.session.v1")!).id,
    "other-game",
  );
});

test("保存历史合并最新记录，主动清空后不复活旧缓存", () => {
  const store = new Memory();
  const s = new LocalSession(game(), store);
  store.setItem(
    "tabletop.history.v1",
    JSON.stringify({ version: 1, seen: ["external"] }),
  );
  s.dispatch({ type: "read" });
  assert.ok(loadHistory(store).seen.has("external"));
  clearHistory(store);
  s.dispatch({ type: "consumeRead" });
  assert.equal(loadHistory(store).seen.size, 1);
  assert.ok(!loadHistory(store).seen.has("external"));
});

test("存储不可读或不可写时仍能在内存推进，并保留历史读取失败提示", () => {
  class Unavailable extends Memory {
    failRead = false;
    failWrite = false;
    override getItem(key: string) {
      if (this.failRead) throw Error("unavailable");
      return super.getItem(key);
    }
    override setItem(key: string, value: string) {
      if (this.failWrite) throw Error("full");
      super.setItem(key, value);
    }
  }
  const store = new Unavailable();
  const s = new LocalSession(game(), store);
  const first = loadHistory(store).seen;
  store.failRead = true;
  s.dispatch({ type: "read" });
  assert.ok(s.getPrivateView("p1"));
  assert.match(s.getWarning(), /读取/);
  store.failRead = false;
  assert.ok([...first].every((id) => loadHistory(store).seen.has(id)));
  store.failWrite = true;
  s.dispatch({ type: "consumeRead" });
  assert.equal(s.getPublicView().readerIndex, 1);
  s.dispatch({ type: "read" });
  assert.ok(s.getPrivateView("p2"));
  assert.match(s.getWarning(), /保存/);
});

test("剩余题量和发言投票阶段不一致的存档拒绝恢复", () => {
  const base = game();
  const speaking = { ...base, phase: "speaking", readerIndex: 3 };
  for (const state of [
    { ...base, pool: base.pool.slice(0, 3) },
    { ...speaking, speakerIndex: 3 },
    { ...speaking, voteIndex: 1, votes: ["p2", null, null] },
    ...["discussion", "voteHandoff", "voting"].map((phase) => ({
      ...speaking,
      phase,
      speakerIndex: 0,
    })),
    {
      ...speaking,
      phase: "discussion",
      speakerIndex: 3,
      voteIndex: 1,
      votes: ["p2", null, null],
    },
    { ...base, speakerIndex: 1 },
  ]) {
    const store = new Memory();
    store.setItem("tabletop.session.v1", JSON.stringify(state));
    const restored = loadSession(store);
    assert.equal(restored.session, null, JSON.stringify(state));
    assert.match(restored.warning, /损坏/);
  }
});

test("真实对局每轮各阶段直到最终排名都可以恢复", () => {
  const store = new Memory();
  let s = new LocalSession(game(), store, () => 1000);
  const restore = () => {
    const before = s.getPublicView();
    const restored = loadSession(store, () => 1000);
    assert.ok(restored.session, before.phase);
    assert.deepEqual(restored.session.getPublicView(), before);
    s = restored.session;
  };
  for (let round = 0; round < 3; round++) {
    restore();
    for (let player = 0; player < 3; player++) {
      s.dispatch({ type: "read" });
      s.dispatch({ type: "consumeRead" });
      restore();
    }
    for (let player = 0; player < 3; player++) {
      s.dispatch({ type: "nextSpeaker" });
      restore();
    }
    s.dispatch({ type: "startVoting" });
    restore();
    for (let player = 0; player < 3; player++) {
      s.dispatch({ type: "openVote" });
      restore();
      s.dispatch({ type: "vote", target: `p${((player + 1) % 3) + 1}` });
      restore();
    }
    s.dispatch({ type: "nextRound" });
    restore();
  }
  assert.equal(s.getPublicView().phase, "finished");
});

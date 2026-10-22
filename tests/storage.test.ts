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
test("结构损坏的存档不会以正常对局恢复", () => {
  for (const patch of [
    { readerIndex: 3 },
    { bluffer: 9 },
    { players: [null, null, null] },
    { roundPoints: [] },
    { phase: "reading", deadline: null },
    { cursor: 500 },
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
  assert.throws(() => clearHistory(broken));
});

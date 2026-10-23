import test from "node:test";
import assert from "node:assert/strict";
import { startReadingClock } from "../src/session/readingClock.ts";
import {
  createGame,
  publicView,
  reduceGame,
} from "../src/games/bluff/engine.ts";
import type { ActionInput, Question } from "../src/games/bluff/types.ts";

function fixture(reading = true) {
  let time = 1000;
  let scheduled = 0;
  const callbacks = new Map<number, () => void>();
  const host = {
    now: () => time,
    setInterval(callback: () => void, ms: number) {
      assert.equal(ms, 100);
      callbacks.set(++scheduled, callback);
      return scheduled;
    },
    clearInterval(id: number) {
      callbacks.delete(id);
    },
  };
  const pool: Question[] = Array.from({ length: 9 }, (_, i) => ({
    id: `q${i}`,
    conceptId: `c${i}`,
    term: `词${i}`,
    explanation: "解释",
    packIds: ["a"],
    status: "verified",
    difficulty: 1,
    sources: [],
  }));
  let state = createGame(
    {
      playerCount: 3,
      readSeconds: 5,
      selectedPackIds: ["a"],
      allowHistoryQuestions: false,
    },
    pool,
    7,
  );
  const actions: ActionInput[] = [];
  const session = {
    getPublicView: () => publicView(state),
    dispatch(input: ActionInput) {
      state = reduceGame(
        state,
        {
          ...input,
          gameId: state.id,
          roundId: state.roundId,
          sequence: state.sequence,
        },
        time,
      );
      actions.push(input);
    },
  };
  if (reading) session.dispatch({ type: "read" });
  actions.length = 0;
  const ticks: number[] = [];
  const errors: unknown[] = [];
  return {
    host,
    session,
    actions,
    callbacks,
    ticks,
    errors,
    advance(now: number) {
      time = now;
      for (const callback of [...callbacks.values()]) callback();
    },
    start: () =>
      startReadingClock(
        session,
        (now) => ticks.push(now),
        (error) => errors.push(error),
        host,
      ),
  };
}

test("非读卡阶段不启动时钟", () => {
  const f = fixture(false);
  const stop = f.start();
  assert.equal(f.callbacks.size, 0);
  stop();
  assert.deepEqual(f.ticks, []);
});

test("读卡更新当前时间，到期只收卡一次并停止", () => {
  const f = fixture();
  f.start();
  assert.equal(f.callbacks.size, 1);
  f.advance(5900);
  assert.equal(f.session.getPublicView().phase, "reading");
  assert.equal(f.ticks.at(-1), 5900);
  f.advance(6000);
  assert.equal(f.session.getPublicView().phase, "handoff");
  assert.equal(f.session.getPublicView().readerIndex, 1);
  assert.equal(f.callbacks.size, 0);
  f.advance(7000);
  assert.deepEqual(f.actions, [{ type: "endRead" }]);
  assert.deepEqual(f.errors, []);
});

test("清理后即使旧回调已排队也不再更新或收卡", () => {
  const f = fixture();
  const stop = f.start();
  const queued = [...f.callbacks.values()][0]!;
  const previousTicks = f.ticks.length;
  stop();
  stop();
  f.advance(6000);
  queued();
  assert.equal(f.callbacks.size, 0);
  assert.equal(f.ticks.length, previousTicks);
  assert.deepEqual(f.actions, []);
});

test("外部已结束读卡时停止，不重复派发收卡", () => {
  const f = fixture();
  f.start();
  const previousTicks = f.ticks.length;
  f.session.dispatch({ type: "consumeRead" });
  f.advance(6000);
  assert.equal(f.callbacks.size, 0);
  assert.equal(f.ticks.length, previousTicks);
  assert.deepEqual(f.actions, [{ type: "consumeRead" }]);
});

test("过期会话派发异常由错误回调接收，时钟停止", () => {
  const f = fixture();
  const error = Error("stale session");
  f.session.dispatch = () => {
    throw error;
  };
  f.start();
  assert.doesNotThrow(() => f.advance(6000));
  assert.deepEqual(f.errors, [error]);
  assert.equal(f.callbacks.size, 0);
  f.advance(7000);
  assert.deepEqual(f.errors, [error]);
});

test("读取会话异常由错误回调接收，不启动时钟", () => {
  const f = fixture();
  const error = Error("unavailable session");
  f.session.getPublicView = () => {
    throw error;
  };
  assert.doesNotThrow(() => f.start()());
  assert.deepEqual(f.errors, [error]);
  assert.equal(f.callbacks.size, 0);
});

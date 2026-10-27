import test from "node:test";
import assert from "node:assert/strict";
import {
  gameAttention,
  lobbyAttention,
  seatAttention,
} from "../src/games/scout/attention.ts";
import { quickPhrases, cleanChatText } from "../src/games/scout/chat-model.ts";
import * as chatModel from "../src/games/scout/chat-model.ts";
import {
  createScout,
  scoutView,
  reduceScout,
} from "../src/games/scout/engine.ts";
test("attention names only pending players and distinguishes the actual actor", () => {
  const s = createScout(
    [
      { id: "a", name: "阿甲" },
      { id: "b", name: "阿乙" },
      { id: "c", name: "阿丙" },
    ],
    "attention",
  );
  let v = scoutView(reduceScout(s, "a", { type: "orient", flip: false }), "a");
  assert.match(gameAttention(v).detail, /阿乙.*阿丙/);
  assert.doesNotMatch(gameAttention(v).detail, /阿甲/);
  assert.equal(seatAttention(v, "b").kind, "waiting");
  v.phase = "playing";
  v.turnId = "b";
  assert.equal(seatAttention(v, "b").kind, "turn");
  assert.match(gameAttention(v).title, /阿乙/);
  assert.equal(seatAttention(v, "a").kind, "idle");
  v.phase = "roundEnd";
  assert.match(gameAttention(v).title, /房主/);
  assert.equal(seatAttention(v, "b").kind, "idle");
});
test("lobby lists unready and offline players separately and keeps ready seats clear", () => {
  const peers = [
    { id: "a", name: "甲", ready: true, online: true },
    { id: "b", name: "乙", ready: false, online: true },
    { id: "c", name: "丙", ready: true, online: false },
  ];
  assert.match(lobbyAttention(peers).detail, /乙/);
  assert.match(lobbyAttention(peers).detail, /丙/);
  assert.doesNotMatch(lobbyAttention(peers).detail, /甲/);
  assert.match(lobbyAttention(peers.slice(0, 1)).title, /同伴/);
});
test("quick chat includes confident frustrated reactive and waiting phrases with bounded plain text", () => {
  assert.deepEqual(
    quickPhrases.map((p) => p.name),
    ["自信", "哀嚎", "接招", "催促"],
  );
  for (const text of [
    "我这牌无敌了",
    "正反面都是好牌呀",
    "这怎么正反面都没用",
    "我这牌烂完了呀",
    "废了吗这不",
    "就等你这么打呢",
    "快点呀我急急急",
    "求求你放过我吧",
    "别搞",
    "这么快就出对了",
    "出这么大吗？",
    "他要跑了，快出大牌",
    "要逃了他",
  ])
    assert(quickPhrases.some((g) => g.phrases.includes(text)));
  assert.equal(cleanChatText("  你好\n朋友  "), "你好 朋友");
  assert.throws(() => cleanChatText("字".repeat(121)), /120/);
});
test("barrage cursor consumes only new fresh messages and never replays stale or duplicate snapshots", () => {
  assert.equal(typeof chatModel.barrageUpdate, "function");
  const message = (seq: number, sentAt = 100000) => ({
    id: `m${seq}`,
    seq,
    sentAt,
    authorId: "a",
    name: "甲",
    text: "别搞",
  });
  const messages = [message(1), message(2), message(3, 70000)];
  const first = chatModel.barrageUpdate(messages, 1, 100000);
  assert.deepEqual(
    first.messages.map((m) => m.seq),
    [2],
  );
  assert.equal(first.after, 3);
  assert.deepEqual(
    chatModel.barrageUpdate(messages, first.after, 100000).messages,
    [],
  );
  assert.equal(chatModel.barrageUpdate([message(1)], 3, 100000).after, 3);
  const reconnected = chatModel.barrageUpdate(messages, 0, 100000, true);
  assert.deepEqual(
    reconnected.messages,
    [],
    "first connected snapshot is history, even when recent",
  );
  assert.equal(reconnected.after, 3);
  assert.deepEqual(
    chatModel
      .barrageUpdate([...messages, message(4)], reconnected.after, 100000)
      .messages.map((m) => m.seq),
    [4],
  );
  assert.deepEqual(
    chatModel
      .barrageUpdate([...messages, message(4)], 3, 100000)
      .messages.map((m) => m.seq),
    [4],
  );
});

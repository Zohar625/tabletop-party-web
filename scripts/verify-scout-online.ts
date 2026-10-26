import assert from "node:assert/strict";
import { createRoom, joinRoom, restoreRoom } from "../src/games/scout/room.ts";
import type { ScoutRoom } from "../src/games/scout/room.ts";

class Memory {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
async function until(check: () => boolean, label: string) {
  const deadline = Date.now() + 25000;
  while (!check() && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert(check(), `超时：${label}`);
}
const rooms: ScoutRoom[] = [];
const stores = [new Memory(), new Memory()];
async function synchronized(label: string) {
  await until(
    () =>
      rooms.every((room) => {
        const snapshot = room.getSnapshot();
        return (
          snapshot.status === "online" &&
          !snapshot.pending &&
          snapshot.peers.length === 2 &&
          snapshot.peers.every((peer) => peer.online) &&
          snapshot.revision === rooms[0].getSnapshot().revision
        );
      }),
    label,
  );
}
try {
  const host = await createRoom("网络验收团长", { store: stores[0] });
  rooms.push(host);
  const guest = await joinRoom(
    "网络验收演员",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    { store: stores[1] },
  );
  rooms.push(guest);
  await Promise.all(rooms.map((room) => room.connect()));
  await synchronized("两名独立客户端在线入座");
  await guest.ready(true);
  await synchronized("两人准备");
  assert(
    rooms.every((room) => room.getSnapshot().peers.every((peer) => peer.ready)),
  );
  await host.startGame();
  await until(
    () => rooms.every((room) => room.getSnapshot().game?.phase === "orienting"),
    "各自收到暗牌",
  );
  await synchronized("开局版本同步");
  for (const room of rooms) {
    const view = room.getSnapshot().game!;
    assert.equal(view.me.hand.length, 11);
    assert(view.players.every((player) => !("hand" in player)));
    assert(!("reserve" in view) && !("seed" in view));
  }
  console.log(
    "PASS 两个独立 MQTT/WebSocket 客户端入座、准备、收取各自私有手牌",
  );
  const guestHand = guest.getSnapshot().game!.me.hand;
  await Promise.all(
    rooms.map((room, index) => room.act({ type: "orient", flip: index === 1 })),
  );
  await until(
    () => rooms.every((room) => room.getSnapshot().game?.phase === "playing"),
    "同时确认手牌方向",
  );
  await synchronized("方向确认版本同步");
  assert(rooms.every((room) => room.getSnapshot().error === ""));
  assert.deepEqual(
    guest.getSnapshot().game!.me.hand,
    [...guestHand]
      .reverse()
      .map((card) => ({ id: card.id, top: card.bottom, bottom: card.top })),
  );
  console.log("PASS 同一轮并发朝向确认，整手倒序并翻转上下数值");
  const first = rooms.find(
    (room) => room.getSnapshot().meId === host.getSnapshot().game!.turnId,
  )!;
  await first.act({ type: "show", start: 0, count: 1 });
  await synchronized("Show 确认");
  assert(
    rooms.every((room) => room.getSnapshot().game!.active?.cards.length === 1),
  );
  const second = rooms.find(
    (room) => room.getSnapshot().meId === host.getSnapshot().game!.turnId,
  )!;
  const beforeScout = second.getSnapshot().game!.me.hand.length;
  await second.act({
    type: "scout",
    side: "left",
    flip: true,
    insertIndex: 0,
    combo: false,
  });
  await synchronized("Scout 确认");
  assert.equal(second.getSnapshot().game!.me.hand.length, beforeScout + 1);
  assert.equal(second.getSnapshot().game!.active, null);
  assert.equal(second.getSnapshot().game!.turnId, second.getSnapshot().meId);
  await second.act({ type: "show", start: 0, count: 1 });
  await synchronized("双人 Scout 后仍由同一人 Show");
  console.log("PASS 实际 Show → Scout → Show，双人规则消耗筹码并保持行动者");
  for (const index of [1, 0]) {
    const old = rooms[index],
      snapshot = old.getSnapshot(),
      view = structuredClone(snapshot.game);
    old.stop();
    const restored = await restoreRoom({ store: stores[index] });
    assert(restored);
    rooms[index] = restored;
    await restored.connect();
    await synchronized(index === 1 ? "成员刷新恢复" : "房主刷新恢复");
    assert.equal(restored.getSnapshot().meId, snapshot.meId);
    assert.equal(restored.getSnapshot().matchId, snapshot.matchId);
    assert.deepEqual(restored.getSnapshot().game, view);
  }
  console.log("PASS 成员与房主刷新恢复身份、版本及权威手牌，无重新发牌");
} finally {
  rooms.forEach((room) => room.stop());
}

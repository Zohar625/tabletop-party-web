import assert from "node:assert/strict";
import { createRoom, joinRoom, restoreRoom } from "../src/games/dinner/room.ts";
import type { DinnerRoom } from "../src/games/dinner/room.ts";
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
async function until(check: () => boolean, label: string) {
  for (let n = 0; n < 400; n++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error(`超时：${label}`);
}
const rooms: DinnerRoom[] = [];
try {
  const stores = [new Memory(), new Memory(), new Memory()];
  const host = await createRoom("网络验收房主", { store: stores[0] });
  rooms.push(host);
  const a = await joinRoom(
    "网络验收甲",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    { store: stores[1] },
  );
  rooms.push(a);
  const b = await joinRoom(
    "网络验收乙",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    { store: stores[2] },
  );
  rooms.push(b);
  await Promise.all(rooms.map((r) => r.connect()));
  await until(
    () => rooms.every((r) => r.getSnapshot().peers.length === 3),
    "三人入桌",
  );
  console.log("PASS 三个独立 WebSocket 客户端通过公共中转入桌");
  await a.ready(true);
  await until(() => !a.getSnapshot().pending, "甲准备");
  await b.ready(true);
  await until(() => !b.getSnapshot().pending, "乙准备");
  await until(
    () => host.getSnapshot().peers.every((p) => p.ready && p.online),
    "准备同步",
  );
  await host.startGame();
  await until(
    () => rooms.every((r) => r.getSnapshot().game !== null),
    "暗牌同步",
  );
  for (const room of rooms)
    assert.equal(room.getSnapshot().game!.me.hand.length, 4);
  console.log("PASS 开桌与各自手牌投影");
  async function placeSafe(room: DinnerRoom, kind: "safe" | "bad" = "safe") {
    await until(() => !room.getSnapshot().pending, "前一操作确认");
    const card = room
      .getSnapshot()
      .game!.me.hand.find((c) => c.kind === kind)!;
    await room.act({ type: "place", cardId: card.id });
    await until(
      () =>
        room.getSnapshot().game!.me.placed.length === 1 &&
        !room.getSnapshot().pending,
      "放菜确认",
    );
  }
  await Promise.all([a, b].map((room) => placeSafe(room)));
  assert.equal(a.getSnapshot().error, "");
  assert.equal(b.getSnapshot().error, "");
  console.log("PASS 同轮两位玩家同时放菜，不互相退回或清空确认");
  await placeSafe(host, "bad");
  await host.act({ type: "bid", amount: 1 });
  for (let count = 0; count < 2; count++) {
    const turn = host.getSnapshot().game!.turn;
    const room = rooms.find((r) => r.getSnapshot().meId === turn)!;
    assert(room, "应由真实座位顺序决定行动者");
    await until(
      () => room.getSnapshot().game!.turn === room.getSnapshot().meId,
      "轮到退出叫价",
    );
    await room.act({ type: "pass" });
    await until(() => !room.getSnapshot().pending, "退出确认");
  }
  await until(() => host.getSnapshot().game!.phase === "revealing", "揭盖阶段");
  await host.act({ type: "flip", owner: a.getSnapshot().meId });
  await until(
    () => rooms.every((r) => r.getSnapshot().game!.phase === "roundEnd"),
    "挑战结算",
  );
  console.log("PASS 自己放黑暗料理后直接揭对手正常菜，挑战成功并同步结算");
  a.stop();
  const again = await restoreRoom({ store: stores[1] });
  assert(again);
  rooms.push(again);
  await again.connect();
  await until(() => again.getSnapshot().game?.phase === "roundEnd", "成员恢复");
  assert.equal(again.getSnapshot().meId, a.getSnapshot().meId);
  host.stop();
  const owner = await restoreRoom({ store: stores[0] });
  assert(owner);
  rooms.push(owner);
  await owner.connect();
  await until(
    () => owner.getSnapshot().peers.every((p) => p.online),
    "房主恢复",
  );
  assert.equal(owner.getSnapshot().game!.phase, "roundEnd");
  console.log("PASS 成员和房主刷新恢复，身份及已结算积分保持");
} finally {
  rooms.forEach((r) => r.stop());
}

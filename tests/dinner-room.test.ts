import test from "node:test";
import assert from "node:assert/strict";
import { createRoom, joinRoom, restoreRoom } from "../src/games/dinner/room.ts";
import type { RoomTransport } from "../src/games/dinner/mqtt.ts";

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
class Wire {
  all: { code: string; transport: RoomTransport }[] = [];
  packets: unknown[] = [];
  factory = (code: string): RoomTransport => {
    const wire = this;
    let open = false;
    const transport: RoomTransport = {
      onMessage: () => {},
      onOffline: () => {},
      async connect() {
        open = true;
      },
      close() {
        open = false;
      },
      send(value) {
        if (!open) throw Error("offline");
        wire.packets.push(structuredClone(value));
        for (const target of wire.all.filter((t) => t.code === code))
          queueMicrotask(() =>
            target.transport.onMessage(structuredClone(value)),
          );
      },
    };
    this.all.push({ code, transport });
    return transport;
  };
}
const waitFor = async (check: () => boolean) => {
  for (let n = 0; n < 150; n++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert(check(), "房间状态没有按预期同步");
};

test("同一初放阶段两位玩家同时提交，各自只放一张且不互相报过期", async () => {
  const wire = new Wire();
  const options = () => ({
    store: new Memory(),
    transport: wire.factory,
    tickMs: 50,
  });
  const host = await createRoom("房主", options());
  const a = await joinRoom(
    "甲",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    options(),
  );
  const b = await joinRoom(
    "乙",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    options(),
  );
  const rooms = [host, a, b];
  try {
    await Promise.all(rooms.map((r) => r.connect()));
    await waitFor(() => rooms.every((r) => r.getSnapshot().peers.length === 3));
    await Promise.all([a.ready(true), b.ready(true)]);
    await waitFor(() =>
      rooms.every(
        (r) =>
          !r.getSnapshot().pending &&
          r.getSnapshot().peers.every((p) => p.ready),
      ),
    );
    await host.startGame();
    await waitFor(() => rooms.every((r) => r.getSnapshot().game !== null));
    assert.equal(a.getSnapshot().revision, b.getSnapshot().revision);
    const moves = [a, b].map((r) => ({
      room: r,
      cardId: r.getSnapshot().game!.me.hand[0].id,
    }));
    await Promise.all(
      moves.map(({ room, cardId }) => room.act({ type: "place", cardId })),
    );
    await waitFor(() =>
      [a, b].every(
        (r) =>
          !r.getSnapshot().pending &&
          r.getSnapshot().game!.me.placed.length === 1,
      ),
    );
    for (const r of [a, b]) {
      assert.equal(r.getSnapshot().error, "");
      assert.equal(r.getSnapshot().game!.me.hand.length, 3);
    }
    const placed = host
      .getSnapshot()
      .game!.players.filter((p) => p.id !== host.getSnapshot().meId);
    assert(placed.every((p) => p.stackCount === 1));
    assert.equal(host.getSnapshot().game!.phase, "initial");
    assert.equal(host.getSnapshot().game!.turn, host.getSnapshot().meId);
    await host.act({
      type: "place",
      cardId: host.getSnapshot().game!.me.hand[0].id,
    });
    await waitFor(() =>
      rooms.every((r) => r.getSnapshot().game!.phase === "placing"),
    );
  } finally {
    rooms.forEach((r) => r.stop());
  }
});
test("三个真实控制器建房、加密开桌、私密手牌、成员和房主刷新恢复", async () => {
  const wire = new Wire(),
    stores = [new Memory(), new Memory(), new Memory()];
  const options = (i: number) => ({
    store: stores[i],
    transport: wire.factory,
    tickMs: 50,
  });
  const host = await createRoom("掌勺", options(0));
  const a = await joinRoom(
    "小明",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    options(1),
  );
  const b = await joinRoom(
    "小红",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    options(2),
  );
  const rooms = [host, a, b];
  try {
    await Promise.all(rooms.map((r) => r.connect()));
    await waitFor(() => rooms.every((r) => r.getSnapshot().peers.length === 3));
    await a.ready(true);
    await b.ready(true);
    await waitFor(() => host.getSnapshot().peers.every((p) => p.ready));
    await host.startGame();
    await waitFor(() => rooms.every((r) => r.getSnapshot().game !== null));
    for (const r of rooms) {
      const view = r.getSnapshot().game!;
      assert.equal(view.me.hand.length, 4);
      assert.equal(view.players.length, 3);
      assert(!("cards" in view.players[0]));
    }
    assert(!JSON.stringify(wire.packets).includes('"hand"'));
    assert(!JSON.stringify(wire.packets).includes('"kind":"bad"'));
    const game = a.getSnapshot().game!;
    await a.act({ type: "place", cardId: game.me.hand[0].id });
    await waitFor(
      () =>
        host
          .getSnapshot()
          .game!.players.find((p) => p.id === a.getSnapshot().meId)!
          .stackCount === 1,
    );
    await waitFor(() => !a.getSnapshot().pending);
    const revision = host.getSnapshot().revision;
    const packet = [...wire.packets]
      .reverse()
      .find(
        (p: any) =>
          p.type === "cipher" &&
          p.from === a.getSnapshot().meId &&
          p.to === host.getSnapshot().meId,
      );
    assert(packet);
    for (let i = 0; i < 3; i++)
      wire.all[0].transport.onMessage(structuredClone(packet));
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(
      host.getSnapshot().revision,
      revision,
      "相同密文重放不能重复放牌",
    );
    await a.leave();
    assert(
      stores[1].getItem("tabletop.dinner.room.v1"),
      "对局中离席必须保留身份供刷新重连",
    );
    const restored = await restoreRoom(options(1));
    assert(restored);
    rooms.push(restored);
    await restored.connect();
    await waitFor(() => restored.getSnapshot().game !== null);
    assert.equal(restored.getSnapshot().meId, a.getSnapshot().meId);
    assert.equal(restored.getSnapshot().game!.me.placed.length, 1);
    host.stop();
    const hostAgain = await restoreRoom(options(0));
    assert(hostAgain);
    rooms.push(hostAgain);
    await hostAgain.connect();
    await waitFor(
      () => hostAgain.getSnapshot().peers.filter((p) => p.online).length === 3,
    );
    assert.equal(
      hostAgain
        .getSnapshot()
        .game!.players.find((p) => p.id === a.getSnapshot().meId)!.stackCount,
      1,
    );
  } finally {
    rooms.forEach((r) => r.stop());
  }
});

test("仅六个玩家可入桌，断线成员未恢复不能开桌", async () => {
  const wire = new Wire();
  let now = 100000;
  const options = () => ({
    store: new Memory(),
    transport: wire.factory,
    now: () => now,
    tickMs: 50,
  });
  const host = await createRoom("房主", options());
  const guests = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      joinRoom(
        `食客${i}`,
        host.getSnapshot().code,
        host.getSnapshot().pin,
        options(),
      ),
    ),
  );
  try {
    await Promise.all([host, ...guests].map((r) => r.connect()));
    await waitFor(
      () =>
        host.getSnapshot().peers.length === 6 &&
        guests.some((g) => g.getSnapshot().status === "closed"),
    );
    assert.equal(host.getSnapshot().peers.length, 6);
    now += 11000;
    await assert.rejects(host.startGame(), /在线|准备/);
  } finally {
    [host, ...guests].forEach((r) => r.stop());
  }
});

test("房主指纹不符拒绝加入，未准备不能开局", async () => {
  const wire = new Wire(),
    h = await createRoom("房主", {
      store: new Memory(),
      transport: wire.factory,
      tickMs: 50,
    });
  const g = await joinRoom("玩家", h.getSnapshot().code, "a".repeat(64), {
    store: new Memory(),
    transport: wire.factory,
    tickMs: 50,
  });
  try {
    await h.connect();
    await g.connect();
    await assert.rejects(h.startGame(), /3|准备|人数/);
    await waitFor(() => g.getSnapshot().error.includes("房主"));
    assert.equal(h.getSnapshot().peers.length, 1);
  } finally {
    h.stop();
    g.stop();
  }
});

test("恢复旧房主页面不能覆盖新页面已保存的进度", async () => {
  const wire = new Wire(),
    store = new Memory();
  const options = { store, transport: wire.factory, tickMs: 10000 };
  const first = await createRoom("房主", options);
  const other = await restoreRoom(options);
  assert(other);
  try {
    await first.connect();
    await other.connect();
    await first.ready(false);
    const latest = store.getItem("tabletop.dinner.room.v1");
    await assert.rejects(other.leave(), /其他页面|重新连接|恢复/);
    assert.equal(store.getItem("tabletop.dinner.room.v1"), latest);
    await assert.rejects(other.ready(true), /其他页面|重新连接|恢复/);
    assert.equal(store.getItem("tabletop.dinner.room.v1"), latest);
  } finally {
    first.stop();
    other.stop();
  }
});

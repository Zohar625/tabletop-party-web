import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  joinRoom,
  restoreRoom,
  hasSavedRoom,
  roomJoinGuard,
  roomLink,
} from "../src/games/scout/room.ts";
import type { ScoutRoom, RoomOptions } from "../src/games/scout/room.ts";
import type { RoomTransport } from "../src/games/dinner/mqtt.ts";
import {
  restoreIdentity,
  sharedKey,
  seal,
  unseal,
} from "../src/games/dinner/crypto.ts";
import { canBeat } from "../src/games/scout/engine.ts";
import type { ScoutAction } from "../src/games/scout/types.ts";

const SAVE = "tabletop.scout.room.v1";
test("a manual action before the last deadline cancels the old timeout", async () => {
  let now = 100000;
  const t = await table(2, { now: () => now });
  try {
    await t.host.setTurnLimit(15);
    await synced(t.rooms);
    await start(t.rooms);
    await orient(t.rooms);
    now = t.host.getSnapshot().turnClock!.deadline;
    await until(() => t.host.getSnapshot().turnClock?.stage === 1);
    const oldDeadline = t.host.getSnapshot().turnClock!.deadline;
    const actor = t.rooms.find(
      (r) => r.getSnapshot().meId === t.host.getSnapshot().game!.turnId,
    )!;
    await until(
      () =>
        actor.getSnapshot().status === "online" && !actor.getSnapshot().pending,
    );
    const before = t.host.getSnapshot().game!.revision;
    now = oldDeadline - 1;
    await actor.act({ type: "show", start: 0, count: 1 });
    await until(() => t.host.getSnapshot().game!.revision === before + 1);
    now = oldDeadline;
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(t.host.getSnapshot().game!.revision, before + 1);
    assert.equal(t.host.getSnapshot().turnClock?.stage, 0);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("a delayed manual request after automatic action is rejected rather than played twice", async () => {
  let now = 100000;
  const t = await table(2, { now: () => now });
  try {
    await t.host.setTurnLimit(15);
    await synced(t.rooms);
    await start(t.rooms);
    await orient(t.rooms);
    if (t.host.getSnapshot().game!.turnId === t.host.getSnapshot().meId) {
      await t.host.act({ type: "show", start: 0, count: 1 });
      await synced(t.rooms);
    }
    const guest = t.rooms[1],
      before = t.host.getSnapshot().game!.revision;
    t.wire.drop = (p) =>
      p.type === "cipher" && p.from === guest.getSnapshot().meId;
    await guest.act(
      guest.getSnapshot().game!.active
        ? {
            type: "scout",
            side: "left",
            flip: false,
            insertIndex: 0,
            combo: false,
          }
        : { type: "show", start: 0, count: 1 },
    );
    const request = t.wire.packets
      .filter((p) => p.type === "cipher" && p.from === guest.getSnapshot().meId)
      .at(-1);
    now = t.host.getSnapshot().turnClock!.deadline;
    await until(() => t.host.getSnapshot().turnClock?.stage === 1);
    now = t.host.getSnapshot().turnClock!.deadline;
    await until(() => t.host.getSnapshot().game!.revision === before + 1);
    t.wire.drop = null;
    t.wire.broadcast(t.host.getSnapshot().code, request);
    await until(() => !guest.getSnapshot().pending);
    assert.match(guest.getSnapshot().error, /桌面已更新/);
    assert.equal(t.host.getSnapshot().game!.revision, before + 1);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("timer settings are host-only and delayed same-version snapshots cannot undo first warning", async () => {
  let now = 100000;
  const t = await table(2, { now: () => now });
  try {
    await t.host.setTurnLimit(15);
    await synced(t.rooms);
    await t.rooms[1].setTurnLimit(30);
    await until(() => !t.rooms[1].getSnapshot().pending);
    assert.match(t.rooms[1].getSnapshot().error, /房主/);
    assert.equal(t.host.getSnapshot().turnLimitSeconds, 15);
    await start(t.rooms);
    await orient(t.rooms);
    const old = t.wire.packets
      .filter(
        (p) =>
          p.type === "cipher" &&
          p.from === t.host.getSnapshot().meId &&
          p.to === t.rooms[1].getSnapshot().meId,
      )
      .at(-1);
    const first = t.host.getSnapshot().turnClock!,
      rev = t.host.getSnapshot().revision;
    now = first.deadline;
    await until(() => t.rooms[1].getSnapshot().turnClock?.stage === 1);
    const seq = t.rooms[1].getSnapshot().clockSeq;
    t.wire.broadcast(t.host.getSnapshot().code, old);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(t.rooms[1].getSnapshot().clockSeq, seq);
    assert.equal(t.rooms[1].getSnapshot().turnClock!.stage, 1);
    assert.equal(t.host.getSnapshot().revision, rev);
    const warningFrame = t.wire.packets
      .filter(
        (p) =>
          p.type === "cipher" &&
          p.from === t.host.getSnapshot().meId &&
          p.to === t.rooms[1].getSnapshot().meId,
      )
      .at(-1);
    const offset = t.rooms[1].getSnapshot().clockOffsetMs;
    t.wire.drop = (p) =>
      p.type === "cipher" && p.from === t.host.getSnapshot().meId;
    now += 1000;
    t.wire.broadcast(t.host.getSnapshot().code, warningFrame);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(
      t.rooms[1].getSnapshot().clockOffsetMs,
      offset,
      "a delayed heartbeat must not move countdown backwards",
    );
    t.wire.drop = null;
    const actor = t.rooms.find((r) => r.getSnapshot().meId === first.actorId)!;
    await until(
      () =>
        actor.getSnapshot().status === "online" && !actor.getSnapshot().pending,
    );
    await actor.act({ type: "show", start: 0, count: 1 });
    await until(() => t.host.getSnapshot().revision === rev + 1);
    assert.equal(t.host.getSnapshot().turnClock?.stage, 0);
    assert.equal(t.host.getSnapshot().timeoutNotice, null);
    await t.host.setTurnLimit(30);
    assert.equal(t.host.getSnapshot().turnClock?.deadline, now + 30000);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("host controls a persisted two-stage timer: warn once, then one legal automatic action", async () => {
  let now = 100000;
  const t = await table(2, { now: () => now });
  try {
    assert.equal(typeof t.host.setTurnLimit, "function");
    assert.equal(t.host.getSnapshot().turnLimitSeconds, 0);
    await assert.rejects(t.host.setTurnLimit(2), /时长|秒/);
    await t.host.setTurnLimit(15);
    await synced(t.rooms);
    await start(t.rooms);
    assert.equal(t.host.getSnapshot().turnClock, null);
    await orient(t.rooms);
    const first = t.host.getSnapshot().turnClock!;
    const revision = t.host.getSnapshot().revision,
      gameRevision = t.host.getSnapshot().game!.revision;
    await t.host.chat("计时不应被聊天重置");
    assert.equal(t.host.getSnapshot().turnClock!.deadline, first.deadline);
    t.host.stop();
    const restored = await restoreRoom(t.options(0));
    assert(restored);
    t.rooms[0] = restored;
    await restored.connect();
    assert.equal(restored.getSnapshot().turnClock!.deadline, first.deadline);
    now = first.deadline;
    await until(() => restored.getSnapshot().turnClock?.stage === 1);
    assert.equal(restored.getSnapshot().revision, revision);
    assert.equal(restored.getSnapshot().game!.revision, gameRevision);
    assert.equal(restored.getSnapshot().turnClock!.deadline, now + 15000);
    assert.match(restored.getSnapshot().timeoutNotice!.text, /首次超时/);
    now += 15000;
    await until(
      () => restored.getSnapshot().game!.revision === gameRevision + 1,
    );
    assert.equal(restored.getSnapshot().revision, revision + 1);
    assert.match(restored.getSnapshot().timeoutNotice!.text, /自动/);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(restored.getSnapshot().game!.revision, gameRevision + 1);
    await restored.setTurnLimit(0);
    assert.equal(restored.getSnapshot().turnClock, null);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("an offline guest does not block online orientation or turns, and nobody may play their turn for them", async () => {
  let now = 100000;
  const t = await table(3, { now: () => now });
  try {
    await start(t.rooms);
    // Reproduce a request already in flight when the guest stops.
    const inFlight = t.wire.packets
      .filter(
        (packet) =>
          packet.type === "cipher" &&
          packet.from === t.rooms[2].getSnapshot().meId,
      )
      .at(-1);
    assert(inFlight);
    t.wire.broadcast(t.host.getSnapshot().code, inFlight);
    t.rooms[2].stop();
    // Deliver queued Wire callbacks, then wait for a host command queued after
    // those encrypted requests. Otherwise a delayed old ping is processed at
    // the advanced fake time and keeps the stopped seat online forever.
    await Promise.resolve();
    await t.host.chat("第一次断线前请求已处理");
    now += 11000;
    await until(
      () =>
        !t.host.getSnapshot().peers[2].online &&
        t.host.getSnapshot().peers[1].online,
    );
    await t.host.act({ type: "orient", flip: false });
    await until(
      () =>
        t.rooms[1].getSnapshot().status === "online" &&
        !t.rooms[1].getSnapshot().pending,
    );
    await t.rooms[1].act({ type: "orient", flip: false });
    await until(() => !t.rooms[1].getSnapshot().pending);
    assert.equal(
      t.host.getSnapshot().game!.players.filter((p) => p.orientationConfirmed)
        .length,
      2,
    );
    const restored = await restoreRoom(t.options(2));
    assert(restored);
    t.rooms[2] = restored;
    await restored.connect();
    await until(() => restored.getSnapshot().status === "online");
    await restored.act({ type: "orient", flip: false });
    await until(() => t.host.getSnapshot().game!.phase === "playing");
    const turnId = t.host.getSnapshot().game!.turnId;
    const offline = t.rooms.find(
      (r) => r !== t.host && r.getSnapshot().meId !== turnId,
    )!;
    offline.stop();
    await Promise.resolve();
    await t.host.chat("第二次断线前请求已处理");
    now += 11000;
    await until(() =>
      t.host
        .getSnapshot()
        .peers.some((p) => p.id === offline.getSnapshot().meId && !p.online),
    );
    const actor = t.rooms.find((r) => r.getSnapshot().meId === turnId)!;
    // Advancing the fake clock also expires the live actor's host heartbeat.
    // Wait for its next encrypted snapshot, not just the host's presence view.
    await until(
      () =>
        actor.getSnapshot().status === "online" &&
        !actor.getSnapshot().pending &&
        actor.getSnapshot().game?.phase === "playing",
    );
    const revision = t.host.getSnapshot().revision;
    await actor.act({ type: "show", start: 0, count: 1 });
    await until(
      () =>
        t.host.getSnapshot().revision > revision &&
        !actor.getSnapshot().pending,
    );
    assert.equal(t.host.getSnapshot().game!.active!.ownerId, turnId);
    const nextId = t.host.getSnapshot().game!.turnId;
    const wrong = t.rooms.find(
      (r) => r !== offline && r.getSnapshot().meId !== nextId,
    )!;
    await until(
      () =>
        wrong.getSnapshot().status === "online" &&
        !wrong.getSnapshot().pending &&
        wrong.getSnapshot().game?.revision ===
          t.host.getSnapshot().game!.revision,
    );
    const before = t.host.getSnapshot().game!.revision;
    await wrong.act({ type: "show", start: 0, count: 1 }).catch(() => {});
    await until(() => !wrong.getSnapshot().pending);
    assert.equal(t.host.getSnapshot().game!.revision, before);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("an old connected guest cannot overwrite a newer room identity before abandoning its seat", async () => {
  const t = await table(2);
  try {
    await start(t.rooms);
    const newer = await createRoom("更新的房间", t.options(1));
    const raw = t.stores[1].getItem(SAVE);
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.equal(
      t.stores[1].getItem(SAVE),
      raw,
      "periodic old snapshots must not overwrite a newer saved identity",
    );
    await assert.rejects(t.rooms[1].forceLeave(), /新|变化/);
    assert.equal(t.stores[1].getItem(SAVE), raw);
    newer.stop();
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("guests may permanently abandon a live seat without a returning host, with stale-save protection", async () => {
  const t = await table(2);
  try {
    await start(t.rooms);
    await orient(t.rooms);
    t.host.stop();
    await t.rooms[1].forceLeave();
    assert.equal(await restoreRoom(t.options(1)), null);
    const newer = await createRoom("新房间", t.options(1));
    const raw = t.stores[1].getItem(SAVE);
    await assert.rejects(t.rooms[1].forceLeave(), /新|变化/);
    assert.equal(t.stores[1].getItem(SAVE), raw);
    newer.stop();
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("a requested creation code is kept exactly and collisions do not silently substitute another code", async () => {
  const wire = new Wire(),
    store = new Memory();
  const host = await createRoom("指定房主", {
    store,
    transport: wire.factory,
    tickMs: 40,
    code: "123456",
  });
  const other = await createRoom("第二桌", {
    store: new Memory(),
    transport: wire.factory,
    tickMs: 40,
    code: "123456",
  });
  try {
    assert.equal(host.getSnapshot().code, "123456");
    await host.connect();
    await other.connect();
    assert.equal(other.getSnapshot().code, "123456");
    assert.equal(other.getSnapshot().status, "closed");
    assert.match(other.getSnapshot().error, /使用/);
    assert.equal(host.getSnapshot().status, "online");
    await assert.rejects(
      createRoom("坏号码", { store: new Memory(), code: "12345" }),
      /6|六/,
    );
  } finally {
    host.stop();
    other.stop();
  }
});
test("room chat uses authenticated authors, deduplicates retries and never advances play revision", async () => {
  const t = await table(2);
  const { rooms, host, wire, options } = t;
  try {
    await start(rooms);
    await orient(rooms);
    const revision = host.getSnapshot().revision,
      game = structuredClone(host.getSnapshot().game);
    await rooms[1].chat("我这牌无敌了");
    await until(
      () =>
        host.getSnapshot().chat?.length === 1 &&
        !rooms[1].getSnapshot().pending,
    );
    assert.equal(
      host.getSnapshot().chat[0].authorId,
      rooms[1].getSnapshot().meId,
    );
    assert.equal(host.getSnapshot().chat[0].name, "演员1");
    assert.equal(host.getSnapshot().chat[0].text, "我这牌无敌了");
    assert.equal(host.getSnapshot().revision, revision);
    assert.deepEqual(host.getSnapshot().game, game);
    const request = wire.packets
      .filter(
        (p) => p.type === "cipher" && p.from === rooms[1].getSnapshot().meId,
      )
      .at(-1);
    wire.broadcast(host.getSnapshot().code, request);
    const oldHostSnapshot = wire.packets
      .filter(
        (p) =>
          p.type === "cipher" &&
          p.from === host.getSnapshot().meId &&
          p.to === rooms[1].getSnapshot().meId,
      )
      .at(-1);
    await host.chat("就等你这么打呢");
    await until(() => rooms[1].getSnapshot().chat?.length === 2);
    assert.deepEqual(
      host.getSnapshot().chat.map((m) => m.seq),
      [1, 2],
    );
    assert.equal(host.getSnapshot().revision, revision);
    wire.drop = (p) =>
      p.type === "cipher" && p.from === host.getSnapshot().meId;
    wire.broadcast(host.getSnapshot().code, oldHostSnapshot);
    await new Promise((resolve) => setTimeout(resolve, 60));
    assert.equal(
      rooms[1].getSnapshot().chat.length,
      2,
      "older equal-revision snapshots cannot erase newer chat",
    );
    wire.drop = null;
    assert(!JSON.stringify(wire.packets).includes("我这牌无敌了"));
    host.stop();
    const restored = await restoreRoom(options(0));
    assert(restored);
    rooms[0] = restored;
    await restored.connect();
    await until(() => restored.getSnapshot().status === "online");
    assert.equal(restored.getSnapshot().chat.length, 2);
  } finally {
    rooms.forEach((r) => r.stop());
  }
});
test("chat rejects invalid text, rate limits per sender and bounds history", async () => {
  let now = 100000;
  const t = await table(2, { now: () => now });
  try {
    await assert.rejects(t.host.chat("   "), /内容|空/);
    await assert.rejects(t.host.chat("字".repeat(121)), /120|长/);
    await t.host.chat("正反面都是好牌呀");
    await assert.rejects(t.host.chat("太快"), /频繁|稍等/);
    for (let i = 0; i < 52; i++) {
      now += 1000;
      await t.host.chat("消息" + i);
    }
    assert.equal(t.host.getSnapshot().chat.length, 50);
    assert.equal(t.host.getSnapshot().chat.at(-1)?.seq, 53);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("an unadmitted join can be cancelled, but admitted and restored seats are protected", async () => {
  const store = new Memory(),
    wire = new Wire();
  const options = { store, transport: wire.factory, tickMs: 40 };
  const guest = await joinRoom("等待成员", "999999", "", options);
  try {
    await guest.connect();
    assert.equal(guest.canCancelJoin(), true);
    await guest.cancelJoin();
    assert.equal(await restoreRoom(options), null);
  } finally {
    guest.stop();
  }
  const t = await table(2);
  try {
    assert.equal(t.rooms[1].canCancelJoin(), false);
    await assert.rejects(t.rooms[1].cancelJoin(), /座位|入桌/);
    t.rooms[1].stop();
    const restored = await restoreRoom(t.options(1));
    assert(restored);
    assert.equal(restored.canCancelJoin(), false);
    await assert.rejects(restored.cancelJoin(), /座位|入桌/);
    restored.stop();
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
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
  all: { code: string; transport: RoomTransport; open: boolean }[] = [];
  packets: any[] = [];
  drop: ((packet: any) => boolean) | null = null;
  factory = (code: string): RoomTransport => {
    const entry = {
      code,
      open: false,
      transport: null as unknown as RoomTransport,
    };
    entry.transport = {
      onMessage: () => {},
      onOffline: () => {},
      async connect() {
        entry.open = true;
      },
      close() {
        entry.open = false;
      },
      send: (value: any) => {
        if (!entry.open) throw Error("offline");
        this.packets.push(structuredClone(value));
        if (this.drop?.(value)) return;
        this.broadcast(code, value);
      },
    };
    this.all.push(entry);
    return entry.transport;
  };
  broadcast(code: string, value: unknown) {
    for (const entry of this.all.filter((t) => t.code === code && t.open))
      queueMicrotask(() => entry.transport.onMessage(structuredClone(value)));
  }
}
async function until(check: () => boolean, label = "room synchronization") {
  const deadline = Date.now() + 6000;
  while (!check() && Date.now() < deadline)
    await new Promise((r) => setTimeout(r, 10));
  assert(check(), label);
}
async function table(count: number, overrides: Partial<RoomOptions> = {}) {
  const wire = new Wire(),
    stores = Array.from({ length: count }, () => new Memory());
  const options = (i: number): RoomOptions => ({
    store: stores[i],
    transport: wire.factory,
    tickMs: 40,
    ...overrides,
  });
  const host = await createRoom("团长", options(0));
  const rooms = [host];
  for (let i = 1; i < count; i++)
    rooms.push(
      await joinRoom(
        `演员${i}`,
        host.getSnapshot().code,
        host.getSnapshot().pin,
        options(i),
      ),
    );
  await Promise.all(rooms.map((r) => r.connect()));
  await until(() =>
    rooms.every(
      (r) =>
        r.getSnapshot().status === "online" &&
        r.getSnapshot().peers.length === count &&
        r.getSnapshot().peers.every((p) => p.online),
    ),
  );
  return { wire, stores, options, rooms, host };
}
async function synced(rooms: ScoutRoom[]) {
  await until(() =>
    rooms.every(
      (r) =>
        !r.getSnapshot().pending &&
        r.getSnapshot().revision === rooms[0].getSnapshot().revision,
    ),
  );
}
async function start(rooms: ScoutRoom[]) {
  await Promise.all(rooms.slice(1).map((r) => r.ready(true)));
  await synced(rooms);
  await rooms[0].startGame();
  await until(() =>
    rooms.every((r) => r.getSnapshot().game?.phase === "orienting"),
  );
  await synced(rooms);
}
async function orient(rooms: ScoutRoom[]) {
  await Promise.all(
    rooms.map((r, i) => r.act({ type: "orient", flip: !!(i % 2) })),
  );
  await until(() =>
    rooms.every(
      (r) =>
        r.getSnapshot().game?.phase === "playing" && !r.getSnapshot().pending,
    ),
  );
  await synced(rooms);
}
async function act(room: ScoutRoom, rooms: ScoutRoom[], action: ScoutAction) {
  await room.act(action);
  await synced(rooms);
  assert.equal(room.getSnapshot().error, "");
}

test("two real encrypted clients receive only their private hand and recover their seats", async () => {
  const { rooms, host, stores, options, wire } = await table(2);
  try {
    await assert.rejects(host.startGame(), /准备/);
    await start(rooms);
    for (let i = 0; i < rooms.length; i++) {
      const view = rooms[i].getSnapshot().game!;
      assert.equal(view.me.hand.length, 11);
      assert.equal(view.me.id, rooms[i].getSnapshot().meId);
      assert(view.players.every((p) => !("hand" in p)));
      assert(!("reserve" in view) && !("seed" in view));
    }
    assert.notDeepEqual(
      rooms[0].getSnapshot().game!.me.hand,
      rooms[1].getSnapshot().game!.me.hand,
    );
    assert(!JSON.stringify(wire.packets).includes('"hand"'));
    const guestIdentity = await restoreIdentity(
      JSON.parse(stores[1].getItem(SAVE)!).identity,
    );
    const hostSaved = JSON.parse(stores[0].getItem(SAVE)!);
    const key = await sharedKey(guestIdentity, hostSaved.peers[0].publicKey);
    const frames = wire.packets.filter(
      (p) => p.type === "cipher" && p.to === guestIdentity.id,
    );
    assert(frames.length);
    for (const frame of frames) {
      const payload = (await unseal(
        key,
        frame.body,
        `${host.getSnapshot().code}:${frame.from}:${frame.to}`,
      )) as any;
      if (payload.game)
        assert.deepEqual(
          payload.game.me.hand,
          rooms[1].getSnapshot().game!.me.hand,
        );
    }
    await orient(rooms);
    const actor = rooms.find(
      (r) => r.getSnapshot().meId === host.getSnapshot().game!.turnId,
    )!;
    await act(actor, rooms, { type: "show", start: 0, count: 1 });
    const before = structuredClone(rooms[1].getSnapshot().game!);
    await assert.rejects(rooms[1].leave(), /对局|保留|stop/);
    assert.equal(rooms[1].getSnapshot().status, "online");
    assert(hasSavedRoom(options(1)));
    rooms[1].stop();
    const restored = await restoreRoom(options(1));
    assert(restored);
    await restored.connect();
    await until(
      () => restored.getSnapshot().game?.revision === before.revision,
    );
    assert.deepEqual(restored.getSnapshot().game, before);
    assert.equal(restored.getSnapshot().meId, rooms[1].getSnapshot().meId);
    rooms[1] = restored;
    host.stop();
    const owner = await restoreRoom(options(0));
    assert(owner);
    rooms[0] = owner;
    await owner.connect();
    await until(() =>
      rooms.every(
        (r) =>
          r.getSnapshot().status === "online" &&
          r.getSnapshot().peers.every((p) => p.online),
      ),
    );
    assert.equal(owner.getSnapshot().game!.revision, before.revision);
    assert.equal(owner.getSnapshot().matchId, before.matchId);
  } finally {
    rooms.forEach((r) => r.stop());
  }
});

async function requestFrom(
  stores: Memory[],
  wire: Wire,
  fromIndex: number,
  command: unknown,
  extra: Record<string, unknown> = {},
) {
  const sender = JSON.parse(stores[fromIndex].getItem(SAVE)!),
    host = JSON.parse(stores[0].getItem(SAVE)!);
  const identity = await restoreIdentity(sender.identity);
  const id = crypto.randomUUID();
  const request = {
    kind: "request",
    id,
    name: sender.name,
    version: host.revision,
    orientationMatch: host.matchId,
    orientationRound: host.game?.round,
    command,
    ...extra,
  };
  const frame = {
    v: 1,
    type: "cipher",
    from: identity.id,
    to: host.hostId,
    publicKey: identity.publicKey,
    body: await seal(
      await sharedKey(identity, host.peers[0].publicKey),
      request,
      `${host.code}:${identity.id}:${host.hostId}`,
    ),
  };
  wire.broadcast(host.code, frame);
  await until(
    () =>
      JSON.parse(stores[0].getItem(SAVE)!).receipts[identity.id]?.some(
        (r: any) => r.id === id,
      ),
    "encrypted request receipt",
  );
  return {
    frame,
    receipt: JSON.parse(stores[0].getItem(SAVE)!).receipts[identity.id].find(
      (r: any) => r.id === id,
    ),
  };
}

test("five clients may confirm orientation concurrently once; old match, wrong round and duplicate confirmations fail", async () => {
  const { rooms, stores, wire, host } = await table(5);
  try {
    await start(rooms);
    const revision = host.getSnapshot().revision;
    const hand = rooms[1].getSnapshot().game!.me.hand;
    for (const room of rooms)
      assert(
        room.getSnapshot().game!.players.every((player) => !("hand" in player)),
      );
    const outsider = await restoreIdentity(
      JSON.parse(stores[1].getItem(SAVE)!).identity,
    );
    const hostKey = JSON.parse(stores[0].getItem(SAVE)!).peers[0].publicKey;
    const anotherPrivateFrame = [...wire.packets]
      .reverse()
      .find(
        (frame) =>
          frame.type === "cipher" &&
          frame.to === rooms[2].getSnapshot().meId &&
          frame.from === host.getSnapshot().meId,
      );
    assert(anotherPrivateFrame);
    await assert.rejects(
      unseal(
        await sharedKey(outsider, hostKey),
        anotherPrivateFrame.body,
        `${host.getSnapshot().code}:${anotherPrivateFrame.from}:${anotherPrivateFrame.to}`,
      ),
    );
    const wrongRound = await requestFrom(
      stores,
      wire,
      1,
      { type: "action", action: { type: "orient", flip: true } },
      { version: revision - 1, orientationRound: 99 },
    );
    assert.match(wrongRound.receipt.error, /更新/);
    const wrongMatch = await requestFrom(
      stores,
      wire,
      1,
      { type: "action", action: { type: "orient", flip: true } },
      { version: revision - 1, orientationMatch: "old-match" },
    );
    assert.match(wrongMatch.receipt.error, /更新/);
    await synced(rooms);
    await orient(rooms);
    assert.deepEqual(
      rooms[1].getSnapshot().game!.me.hand,
      [...hand]
        .reverse()
        .map((c) => ({ id: c.id, top: c.bottom, bottom: c.top })),
    );
    assert(
      rooms.every(
        (r) =>
          r.getSnapshot().error === "" &&
          r.getSnapshot().game!.players.every((p) => p.orientationConfirmed),
      ),
    );
    const confirmed = host.getSnapshot().revision;
    const duplicate = await requestFrom(
      stores,
      wire,
      1,
      { type: "action", action: { type: "orient", flip: false } },
      { version: revision },
    );
    assert.match(duplicate.receipt.error, /更新/);
    assert.equal(host.getSnapshot().revision, confirmed);
  } finally {
    rooms.forEach((r) => r.stop());
  }
});

test("Show and Scout reject stale revisions and out-of-turn moves; ciphertext replay cannot apply twice", async () => {
  const { rooms, stores, wire, host } = await table(3);
  try {
    await start(rooms);
    await orient(rooms);
    const turnId = host.getSnapshot().game!.turnId;
    const actorIndex = rooms.findIndex((r) => r.getSnapshot().meId === turnId);
    const otherIndex = (actorIndex + 1) % 3;
    const badTurn = await requestFrom(stores, wire, otherIndex, {
      type: "action",
      action: { type: "show", start: 0, count: 1 },
    });
    assert.match(badTurn.receipt.error, /轮到/);
    const revision = host.getSnapshot().revision;
    const result = await requestFrom(stores, wire, actorIndex, {
      type: "action",
      action: { type: "show", start: 0, count: 1 },
    });
    assert.equal(result.receipt.error, "");
    wire.broadcast(host.getSnapshot().code, result.frame);
    const staleShow = await requestFrom(
      stores,
      wire,
      otherIndex,
      { type: "action", action: { type: "show", start: 0, count: 1 } },
      { version: revision },
    );
    assert.match(staleShow.receipt.error, /更新/);
    const staleScout = await requestFrom(
      stores,
      wire,
      otherIndex,
      {
        type: "action",
        action: {
          type: "scout",
          side: "left",
          flip: false,
          insertIndex: 0,
          combo: false,
        },
      },
      { version: revision },
    );
    assert.match(staleScout.receipt.error, /更新/);
    assert.equal(host.getSnapshot().revision, revision + 1);
    await synced(rooms);
    const nextActor = rooms.find(
      (r) => r.getSnapshot().meId === host.getSnapshot().game!.turnId,
    )!;
    await act(nextActor, rooms, {
      type: "scout",
      side: "left",
      flip: true,
      insertIndex: 0,
      combo: false,
    });
    assert.equal(nextActor.getSnapshot().game!.me.hand.length, 13);
  } finally {
    rooms.forEach((r) => r.stop());
  }
});

test("max five seats, readiness, offline members, kick and lobby leave are guarded", async () => {
  let now = 100000;
  const { rooms, host, options, wire } = await table(5, {
    now: () => now,
    tickMs: 10000,
  });
  const sixth = await joinRoom(
    "多余",
    host.getSnapshot().code,
    host.getSnapshot().pin,
    { store: new Memory(), transport: wire.factory, tickMs: 40 },
  );
  try {
    await sixth.connect();
    await host.ready(true); // Publish discovery after the late client subscribes.
    await until(() => sixth.getSnapshot().status === "closed");
    assert.equal(host.getSnapshot().peers.length, 5);
    await assert.rejects(host.startGame(), /准备/);
    await Promise.all(rooms.slice(1).map((r) => r.ready(true)));
    await synced(rooms);
    rooms[4].stop();
    now += 11000;
    await assert.rejects(host.startGame(), /在线/);
    // Kicking an offline member must remain possible after peers are marked offline.
    await host.kick(rooms[4].getSnapshot().meId);
    await until(() =>
      rooms.slice(0, 4).every((r) => r.getSnapshot().peers.length === 4),
    );
    await rooms[3].leave();
    await until(() => host.getSnapshot().peers.length === 3);
    assert(!hasSavedRoom(options(3)));
    await host.leave();
    await until(() =>
      rooms.slice(1, 3).every((r) => r.getSnapshot().status === "closed"),
    );
    assert(!hasSavedRoom(options(0)));
  } finally {
    [...rooms, sixth].forEach((r) => r.stop());
  }
});

test("host fingerprint and stale restored host guard preserve the current room", async () => {
  const { rooms, host, stores, options, wire } = await table(2);
  const impostor = await joinRoom(
    "错误邀请",
    host.getSnapshot().code,
    "a".repeat(64),
    { store: new Memory(), transport: wire.factory, tickMs: 40 },
  );
  const stale = await restoreRoom(options(0));
  assert(stale);
  try {
    await impostor.connect();
    await until(() => impostor.getSnapshot().error.includes("房主"));
    assert.equal(host.getSnapshot().peers.length, 2);
    await stale.connect();
    await host.ready(false);
    await synced(rooms);
    const latest = stores[0].getItem(SAVE);
    await assert.rejects(stale.leave(), /其他页面/);
    assert.equal(stores[0].getItem(SAVE), latest);
    await assert.rejects(stale.ready(true), /连接|其他页面/);
  } finally {
    [...rooms, stale, impostor].forEach((r) => r.stop());
  }
});

async function finishMatch(rooms: ScoutRoom[]) {
  for (
    let n = 0;
    n < 250 && rooms[0].getSnapshot().game!.phase !== "finished";
    n++
  ) {
    const view = rooms[0].getSnapshot().game!;
    if (view.phase === "roundEnd") {
      await act(rooms[0], rooms, { type: "next" });
      continue;
    }
    if (view.phase === "orienting") {
      await orient(rooms);
      continue;
    }
    const actor = rooms.find((r) => r.getSnapshot().meId === view.turnId)!;
    const hand = actor.getSnapshot().game!.me.hand;
    let show: ScoutAction | undefined;
    for (let count = hand.length; count > 0 && !show; count--)
      for (let start = 0; start + count <= hand.length && !show; start++)
        if (
          canBeat(hand.slice(start, start + count), view.active?.cards ?? null)
        )
          show = { type: "show", start, count };
    await act(
      actor,
      rooms,
      show ?? {
        type: "scout",
        side: "left",
        flip: false,
        insertIndex: 0,
        combo: false,
      },
    );
  }
  assert.equal(rooms[0].getSnapshot().game!.phase, "finished");
}
test("a full two-player match enforces host-only next and rematch creates a new match identity", async () => {
  const { rooms, host, stores, wire } = await table(2);
  try {
    await start(rooms);
    const firstId = host.getSnapshot().matchId;
    await orient(rooms);
    const guestNext = await requestFrom(stores, wire, 1, {
      type: "action",
      action: { type: "next" },
    });
    assert.match(guestNext.receipt.error, /房主/);
    const staleNext = await requestFrom(
      stores,
      wire,
      0,
      { type: "action", action: { type: "next" } },
      { version: host.getSnapshot().revision - 1 },
    );
    assert.match(staleNext.receipt.error, /更新/);
    await synced(rooms);
    await finishMatch(rooms);
    assert.equal(host.getSnapshot().game!.history.length, 2);
    await host.rematch();
    await synced(rooms);
    assert.equal(host.getSnapshot().game!.phase, "orienting");
    assert.notEqual(host.getSnapshot().matchId, firstId);
    assert.equal(host.getSnapshot().game!.matchId, host.getSnapshot().matchId);
  } finally {
    rooms.forEach((r) => r.stop());
  }
});

test("room invitation helpers reject malformed codes and protect an existing controller", async () => {
  const store = new Memory(),
    wire = new Wire();
  assert.equal(hasSavedRoom({ store }), false);
  const host = await createRoom("  ", { store, transport: wire.factory });
  try {
    assert.match(host.getSnapshot().code, /^\d{6}$/);
    assert.equal(host.getSnapshot().peers[0].name, "团长");
    assert.equal(roomJoinGuard(null, false), "");
    assert(roomJoinGuard(host.getSnapshot(), true));
    assert(hasSavedRoom({ store }));
    const link = new URL(
      roomLink(host.getSnapshot().code, host.getSnapshot().pin),
      "https://example.com",
    );
    assert.equal(link.searchParams.get("room"), host.getSnapshot().code);
    assert.equal(link.searchParams.get("pin"), host.getSnapshot().pin);
    await assert.rejects(
      joinRoom("甲", "12345", "", {
        store: new Memory(),
        transport: wire.factory,
      }),
      /6位/,
    );
  } finally {
    host.stop();
  }
});

test("next round can deal while a guest is offline and the guest restores their new private hand", async () => {
  let now = 100000;
  const { rooms, stores, options, host, wire } = await table(2, {
    now: () => now,
    tickMs: 10000,
  });
  try {
    await start(rooms);
    host.stop();
    // Explicit round-end fixture, with an offline empty-hand winner.
    const saved = JSON.parse(stores[0].getItem(SAVE)!);
    saved.game.phase = "roundEnd";
    saved.game.players[1].hand = [];
    saved.game.players[1].handCount = 0;
    stores[0].setItem(SAVE, JSON.stringify(saved));
    const restored = await restoreRoom({ ...options(0), tickMs: 40 });
    assert(restored);
    rooms[0] = restored;
    await restored.connect();
    rooms[1].stop();
    now += 11000;
    const before = restored.getSnapshot().revision;
    await restored.act({ type: "next" });
    assert.equal(restored.getSnapshot().revision, before + 1);
    assert.equal(restored.getSnapshot().game!.phase, "orienting");
    await restored.act({ type: "orient", flip: false });
    const guest = await restoreRoom(options(1));
    assert(guest);
    rooms[1] = guest;
    // Presence may arrive before the encrypted private snapshot. Reproduce that
    // ordering explicitly so an empty peers.every(...) cannot pass the wait.
    wire.drop = (frame) =>
      frame.type === "cipher" && frame.from === restored.getSnapshot().meId;
    await guest.connect();
    await until(() => restored.getSnapshot().peers.every((p) => p.online));
    assert.equal(guest.getSnapshot().game, null);
    setTimeout(() => {
      wire.drop = null;
    }, 120);
    await until(() =>
      rooms.every((r) => {
        const snapshot = r.getSnapshot();
        return (
          snapshot.status === "online" &&
          snapshot.peers.length === 2 &&
          snapshot.peers.every((p) => p.online) &&
          snapshot.revision === restored.getSnapshot().revision &&
          snapshot.game?.round === 2
        );
      }),
    );
    assert.equal(guest.getSnapshot().game!.me.hand.length, 11);
    assert.equal(guest.getSnapshot().game!.round, 2);
  } finally {
    rooms.forEach((r) => r.stop());
  }
});

test("code collision rejects only the unclaimed room and preserves the established host", async () => {
  const wire = new Wire(),
    aStore = new Memory(),
    bStore = new Memory();
  const first = await createRoom("先建", {
    store: aStore,
    transport: wire.factory,
    tickMs: 40,
  });
  await createRoom("后建", {
    store: bStore,
    transport: wire.factory,
    tickMs: 40,
  });
  const saved = JSON.parse(bStore.getItem(SAVE)!);
  saved.code = first.getSnapshot().code;
  bStore.setItem(SAVE, JSON.stringify(saved));
  const later = await restoreRoom({
    store: bStore,
    transport: wire.factory,
    tickMs: 40,
  });
  assert(later);
  try {
    await first.connect();
    await later.connect();
    await until(() => later.getSnapshot().status === "closed");
    assert.match(later.getSnapshot().error, /已被使用/);
    assert.equal(first.getSnapshot().status, "online");
    assert.equal(first.getSnapshot().peers.length, 1);
  } finally {
    first.stop();
    later.stop();
  }
});

test("an old unclaimed restore cannot overwrite newer saved progress after probing", async () => {
  const store = new Memory();
  const first = await createRoom("团长", {
    store,
    transport: new Wire().factory,
    tickMs: 10000,
  });
  const stale = await restoreRoom({
    store,
    transport: new Wire().factory,
    tickMs: 10000,
  });
  assert(stale);
  try {
    await first.connect();
    await first.ready(false);
    const latest = store.getItem(SAVE);
    await assert.rejects(stale.connect(), /其他页面/);
    assert.equal(store.getItem(SAVE), latest);
  } finally {
    first.stop();
    stale.stop();
  }
});

test("a forged leave command can only remove its authenticated sender, never another guest", async () => {
  const { rooms, stores, wire, host } = await table(3);
  try {
    const victim = rooms[2].getSnapshot().meId,
      sender = rooms[1].getSnapshot().meId;
    const result = await requestFrom(stores, wire, 1, {
      type: "leave",
      playerId: victim,
    });
    assert.equal(result.receipt.error, "");
    assert(host.getSnapshot().peers.some((peer) => peer.id === victim));
    assert(!host.getSnapshot().peers.some((peer) => peer.id === sender));
    assert.equal(rooms[2].getSnapshot().status, "online");
  } finally {
    rooms.forEach((room) => room.stop());
  }
});

async function finishedTable() {
  const fixture = await table(4);
  await start(fixture.rooms);
  fixture.host.stop();
  const saved = JSON.parse(fixture.stores[0].getItem(SAVE)!);
  saved.game.phase = "finished";
  saved.playing = false;
  saved.game.history = [
    {
      round: 1,
      starterId: saved.game.starterId,
      reason: "emptyHand",
      leaderId: saved.game.players[1].id,
      lines: saved.game.players.map((player: any, index: number) => ({
        id: player.id,
        name: player.name,
        captured: 4 - index,
        scoutChips: 0,
        remainingPenalty: 0,
        delta: 4 - index,
        total: 4 - index,
      })),
    },
  ];
  saved.game.players.forEach((player: any, index: number) => {
    player.total = 4 - index;
  });
  saved.revision++;
  fixture.stores[0].setItem(SAVE, JSON.stringify(saved));
  const restored = await restoreRoom(fixture.options(0));
  assert(restored);
  fixture.host = restored;
  fixture.rooms[0] = restored;
  await restored.connect();
  await until(() =>
    fixture.rooms.every(
      (room) =>
        room.getSnapshot().game?.phase === "finished" &&
        room.getSnapshot().peers.every((peer) => peer.online),
    ),
  );
  return fixture;
}

test("finished players can leave or be kicked, preserving score history and allowing remaining peers to rematch", async () => {
  const { rooms, host, options } = await finishedTable();
  try {
    const history = structuredClone(host.getSnapshot().game!.history),
      oldMatch = host.getSnapshot().matchId;
    await rooms[1].leave();
    assert(!hasSavedRoom(options(1)));
    assert.equal(host.getSnapshot().peers.length, 3);
    assert(
      !host
        .getSnapshot()
        .peers.some((peer) => peer.id === rooms[1].getSnapshot().meId),
    );
    assert.deepEqual(host.getSnapshot().game!.history, history);
    await until(() => rooms[3].getSnapshot().peers.length === 3);
    await host.kick(rooms[2].getSnapshot().meId);
    await until(
      () =>
        rooms[2].getSnapshot().status === "closed" &&
        rooms[3].getSnapshot().peers.length === 2,
    );
    assert.deepEqual(host.getSnapshot().game!.history, history);
    await host.rematch();
    await synced([host, rooms[3]]);
    assert.equal(host.getSnapshot().game!.players.length, 2);
    assert.equal(host.getSnapshot().game!.phase, "orienting");
    assert.notEqual(host.getSnapshot().matchId, oldMatch);
  } finally {
    rooms.forEach((room) => room.stop());
  }
});

test("permanent leave retains identity until its encrypted host acknowledgement and retries a lost acknowledgement", async () => {
  const { rooms, stores, wire, host, options } = await table(2);
  try {
    const guest = rooms[1],
      guestId = guest.getSnapshot().meId;
    wire.drop = (frame) =>
      frame.type === "cipher" &&
      frame.from === host.getSnapshot().meId &&
      frame.to === guestId;
    let settled = false;
    const leaving = guest.leave().finally(() => {
      settled = true;
    });
    await until(() => host.getSnapshot().peers.length === 1);
    assert(
      hasSavedRoom(options(1)),
      "identity remains recoverable until the host acknowledgement arrives",
    );
    assert.equal(settled, false);
    assert(JSON.parse(stores[0].getItem(SAVE)!).blocked.includes(guestId));
    wire.drop = null;
    await leaving;
    assert(!hasSavedRoom(options(1)));
    assert.equal(guest.getSnapshot().status, "closed");
  } finally {
    rooms.forEach((room) => room.stop());
  }
});

test("a leave timeout preserves the saved identity and the host seat for restoration", async () => {
  const { rooms, wire, host, options } = await table(2);
  try {
    const guestId = rooms[1].getSnapshot().meId;
    wire.drop = (frame) => frame.type === "cipher" && frame.from === guestId;
    await assert.rejects(rooms[1].leave(), /确认|超时|恢复/);
    assert(hasSavedRoom(options(1)));
    assert(host.getSnapshot().peers.some((peer) => peer.id === guestId));
    rooms[1].stop();
    wire.drop = null;
    const restored = await restoreRoom(options(1));
    assert(restored);
    rooms[1] = restored;
    await restored.connect();
    await until(
      () =>
        restored.getSnapshot().status === "online" &&
        restored.getSnapshot().peers.length === 2,
    );
    assert.equal(restored.getSnapshot().meId, guestId);
  } finally {
    rooms.forEach((room) => room.stop());
  }
});

test("the host can explicitly close an ongoing match and notify every guest", async () => {
  const { rooms, host, options } = await table(3);
  try {
    await start(rooms);
    await host.leave();
    await until(() =>
      rooms.slice(1).every((room) => room.getSnapshot().status === "closed"),
    );
    assert(!hasSavedRoom(options(0)));
    assert(
      rooms.slice(1).every((_, index) => hasSavedRoom(options(index + 1))),
    );
    assert.equal(host.getSnapshot().status, "closed");
  } finally {
    rooms.forEach((room) => room.stop());
  }
});

test("dismiss a closed seat without deleting a newer room identity", async () => {
  const { rooms, host, options, stores } = await table(2);
  try {
    assert.throws(() => rooms[1].discardClosed(), /结束/);
    await start(rooms);
    await host.leave();
    await until(() => rooms[1].getSnapshot().status === "closed");
    rooms[1].discardClosed();
    assert.equal(await restoreRoom(options(1)), null);
    const newer = await createRoom("新团长", options(1));
    const current = stores[1].getItem(SAVE);
    assert.throws(() => rooms[1].discardClosed(), /新|变化/);
    assert.equal(stores[1].getItem(SAVE), current);
    newer.stop();
  } finally {
    rooms.forEach((room) => room.stop());
  }
});

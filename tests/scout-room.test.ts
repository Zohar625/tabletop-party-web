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
    await rooms[1].leave();
    assert(hasSavedRoom(options(1)));
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

test("next round waits for an offline participant even when their previous hand is empty", async () => {
  let now = 100000;
  const { rooms, stores, options, host } = await table(2, {
    now: () => now,
    tickMs: 10000,
  });
  try {
    await start(rooms);
    host.stop();
    // A persisted round-end fixture represents an empty-hand winner; the room
    // must check presence before reduceScout deals fresh private cards.
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
    await assert.rejects(restored.act({ type: "next" }), /离线/);
    assert.equal(restored.getSnapshot().revision, before);
    assert.equal(restored.getSnapshot().game!.phase, "roundEnd");
    const guest = await restoreRoom(options(1));
    assert(guest);
    rooms[1] = guest;
    await guest.connect();
    await until(() =>
      rooms.every((r) => r.getSnapshot().peers.every((p) => p.online)),
    );
    await act(restored, rooms, { type: "next" });
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

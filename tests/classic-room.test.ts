import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  joinRoom,
  restoreRoom,
  hasSavedRoom,
  clearSavedRoom,
  savedRoomRecord,
} from "../src/games/bluff-classic/room.ts";
import type {
  ClassicRoom,
  RoomOptions,
} from "../src/games/bluff-classic/room.ts";
import type { ClassicCard } from "../src/games/bluff-classic/types.ts";
import type { RoomTransport } from "../src/games/dinner/mqtt.ts";
import {
  restoreIdentity,
  sharedKey,
  unseal,
  seal,
} from "../src/games/dinner/crypto.ts";
const SAVE = "tabletop.bluff.classic.room.v1";
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
  clients = new Set<any>();
  packets: any[] = [];
  drop: ((p: any) => boolean) | null = null;
  factory = () => {
    const wire = this;
    const client: RoomTransport = {
      onMessage: () => {},
      onOffline: () => {},
      async connect() {
        wire.clients.add(client);
      },
      send(p) {
        wire.packets.push(p);
        if (!wire.drop?.(p)) wire.broadcast(p);
      },
      close() {
        wire.clients.delete(client);
      },
    };
    return client;
  };
  broadcast(p: any) {
    for (const c of this.clients)
      queueMicrotask(() => c.onMessage(structuredClone(p)));
  }
}
const cards: ClassicCard[] = Array.from({ length: 40 }, (_, i) => ({
  id: `c${i}`,
  conceptId: `c${i}`,
  term: `term${i}`,
  explanation: `PRIVATE-ANSWER-${i}`,
  sources: [],
  difficulty: 1,
  hints: ["提示"],
}));
async function until(check: () => boolean) {
  const end = Date.now() + 4000;
  while (!check() && Date.now() < end)
    await new Promise((r) => setTimeout(r, 10));
  assert(check(), "network synchronization timeout");
}
async function table() {
  let time = 100000;
  const wire = new Wire(),
    stores = [new Memory(), new Memory(), new Memory()];
  let loads = 0;
  const options = (i: number): RoomOptions => ({
    code: "913574",
    store: stores[i],
    transport: wire.factory,
    now: () => time,
    tickMs: 25,
    loadCards: async () => {
      loads++;
      return cards;
    },
  });
  const host = await createRoom("host", options(0));
  const rooms = [
    host,
    await joinRoom("guest1", "913574", host.getSnapshot().pin, options(1)),
    await joinRoom("guest2", "913574", host.getSnapshot().pin, options(2)),
  ];
  for (const r of rooms) await r.connect();
  await until(() => rooms.every((r) => r.getSnapshot().peers.length === 3));
  return {
    host,
    rooms,
    wire,
    stores,
    options,
    get loads() {
      return loads;
    },
    advance: (ms: number) => {
      time += ms;
    },
  };
}
async function sync(rooms: ClassicRoom[]) {
  await until(() =>
    rooms.every(
      (r) =>
        !r.getSnapshot().pending &&
        r.getSnapshot().revision === rooms[0].getSnapshot().revision,
    ),
  );
}
async function start(rooms: ClassicRoom[]) {
  await Promise.all(rooms.slice(1).map((r) => r.ready(true)));
  await sync(rooms);
  await rooms[0].startGame();
  await sync(rooms);
}
test("encrypted three-client full round, concurrent confirmation, host-only lazy bank, deadline privacy and restore", async () => {
  const t = await table();
  try {
    assert.equal(t.loads, 0);
    await start(t.rooms);
    assert.equal(t.loads, 1);
    await Promise.all(t.rooms.map((r) => r.act({ type: "confirmRole" })));
    await sync(t.rooms);
    assert(t.host.getSnapshot().game!.players.every((p) => p.confirmed));
    await t.host.act({ type: "beginRead" });
    await sync(t.rooms);
    const truth = t.rooms.find(
      (r) => r.getSnapshot().game!.me.role === "truth",
    )!;
    assert.match(truth.getSnapshot().game!.me.answer!, /PRIVATE/);
    for (const room of t.rooms) {
      const g = room.getSnapshot().game!;
      assert(!("truthId" in g));
      assert(!("deck" in g));
      if (g.me.role !== "truth") assert.equal(g.me.answer, null);
    }
    const readPacket = t.wire.packets
      .filter(
        (p) =>
          p.type === "cipher" &&
          p.to === truth.getSnapshot().meId &&
          p.from === t.host.getSnapshot().meId,
      )
      .at(-1);
    t.advance(9000);
    await until(() =>
      t.rooms.every((r) => r.getSnapshot().game?.phase === "discussion"),
    );
    assert(t.rooms.every((r) => r.getSnapshot().game!.me.answer === null));
    t.wire.broadcast(readPacket);
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(truth.getSnapshot().game!.me.answer, null);
    const thinker = t.rooms.find(
      (r) => r.getSnapshot().meId === t.host.getSnapshot().game!.thinkerId,
    )!;
    await thinker.act({ type: "guess", target: truth.getSnapshot().meId });
    await sync(t.rooms);
    assert.equal(t.host.getSnapshot().game!.phase, "results");
    assert(t.host.getSnapshot().game!.result!.correct);
    const id = t.rooms[1].getSnapshot().meId;
    t.rooms[1].stop();
    const restored = await restoreRoom(t.options(1));
    assert(restored);
    t.rooms[1] = restored;
    await restored.connect();
    await sync(t.rooms);
    assert.equal(restored.getSnapshot().meId, id);
    assert.equal(restored.getSnapshot().game!.phase, "results");
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("chat authenticated, Unicode limit, independent revision, rate limit; forceLeave abandons even with pending operation", async () => {
  const t = await table();
  try {
    const rev = t.host.getSnapshot().revision;
    await t.rooms[1].sendChat("😀".repeat(120));
    await until(() => t.host.getSnapshot().chat.length === 1);
    assert.equal(
      t.host.getSnapshot().chat[0].authorId,
      t.rooms[1].getSnapshot().meId,
    );
    assert.equal(t.host.getSnapshot().revision, rev);
    await assert.rejects(t.rooms[1].sendChat("a".repeat(121)), /120/);
    await assert.rejects(t.rooms[1].sendChat("again"), /频繁/);
    t.wire.drop = (p) => p.from === t.rooms[2].getSnapshot().meId;
    await t.rooms[2].ready(true);
    await t.rooms[2].forceLeave();
    assert.equal(t.rooms[2].getSnapshot().status, "closed");
    assert(!hasSavedRoom(t.options(2)));
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("stale host and guest instances cannot overwrite or delete a new identity", async () => {
  const t = await table();
  try {
    for (const i of [0, 1]) {
      const old = t.rooms[i];
      const newer = await createRoom("new", t.options(i));
      const raw = t.stores[i].getItem(SAVE);
      await assert.rejects(old.forceLeave(), /变化|新/);
      assert.equal(t.stores[i].getItem(SAVE), raw);
      newer.stop();
    }
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("offline guests do not block reading or discussion, local deadline hides answer before a new host packet", async () => {
  const t = await table();
  try {
    await start(t.rooms);
    await Promise.all(t.rooms.map((r) => r.act({ type: "confirmRole" })));
    await sync(t.rooms);
    await t.host.act({ type: "beginRead" });
    await sync(t.rooms);
    const truth = t.rooms.find(
      (r) => r.getSnapshot().game!.me.role === "truth",
    )!;
    const other =
      t.rooms.find((r) => r !== truth && r !== t.host) ?? t.rooms[1];
    other.stop();
    t.wire.drop = (p) => p.from === t.host.getSnapshot().meId;
    t.advance(9000);
    assert.equal(truth.getSnapshot().game!.me.answer, null);
    await until(() => t.host.getSnapshot().game!.phase === "discussion");
    assert.equal(t.host.getSnapshot().game!.me.answer, null);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("host permissions, stale encrypted replay and private wire projections", async () => {
  const t = await table();
  try {
    await t.rooms[1].configure({
      ...t.host.getSnapshot().settings,
      readSeconds: 15,
    });
    await sync(t.rooms);
    assert.match(t.rooms[1].getSnapshot().error, /房主/);
    await start(t.rooms);
    const guest = t.rooms[1];
    await guest.act({ type: "confirmRole" });
    await sync(t.rooms);
    const frame = t.wire.packets
      .filter((p) => p.type === "cipher" && p.from === guest.getSnapshot().meId)
      .at(-1);
    const rev = t.host.getSnapshot().revision;
    t.wire.broadcast(frame);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(t.host.getSnapshot().revision, rev);
    for (const r of [t.host, t.rooms[2]]) {
      await r.act({ type: "confirmRole" });
      await sync(t.rooms);
    }
    await guest.act({ type: "beginRead" });
    await sync(t.rooms);
    assert.match(guest.getSnapshot().error, /房主/);
    assert.equal(t.host.getSnapshot().game!.phase, "roles");
    await t.host.act({ type: "beginRead" });
    await sync(t.rooms);
    for (let i = 1; i < 3; i++) {
      const identity = await restoreIdentity(
        JSON.parse(t.stores[i].getItem(SAVE)!).identity,
      );
      const packet = t.wire.packets
        .filter(
          (p) =>
            p.type === "cipher" &&
            p.to === identity.id &&
            p.from === t.host.getSnapshot().meId,
        )
        .at(-1);
      const payload = (await unseal(
        await sharedKey(identity, packet.publicKey),
        packet.body,
        `913574:${packet.from}:${packet.to}`,
      )) as any;
      for (const key of ["truthId", "question", "deck", "seed", "usedConcepts"])
        assert(!(key in payload.game));
      assert(payload.game.players.every((p: any) => !("role" in p)));
      if (payload.game.me.role !== "truth")
        assert.equal(payload.game.me.answer, null);
    }
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("chat retains fifty messages, has independent monotonic sequence, ignores a replayed older history", async () => {
  const t = await table();
  try {
    const rev = t.host.getSnapshot().revision;
    for (let i = 0; i < 51; i++) {
      t.advance(900);
      await t.host.sendChat(`消息${i}`);
    }
    await until(() => t.rooms[1].getSnapshot().chat.at(-1)?.seq === 51);
    assert.equal(t.host.getSnapshot().revision, rev);
    assert.equal(t.host.getSnapshot().chat.length, 50);
    assert.equal(t.host.getSnapshot().chat[0].seq, 2);
    const old = t.wire.packets.filter(
      (p) =>
        p.type === "cipher" &&
        p.to === t.rooms[1].getSnapshot().meId &&
        p.from === t.host.getSnapshot().meId,
    )[1];
    t.wire.broadcast(old);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(t.rooms[1].getSnapshot().chat.at(-1)!.seq, 51);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("restoration immediately claims storage ownership against an older controller", async () => {
  const t = await table();
  try {
    for (const i of [0, 1]) {
      const old = t.rooms[i];
      old.stop();
      const restored = await restoreRoom(t.options(i));
      assert(restored);
      const raw = t.stores[i].getItem(SAVE);
      await assert.rejects(old.forceLeave(), /变化|新/);
      assert.equal(t.stores[i].getItem(SAVE), raw);
      t.rooms[i] = restored;
    }
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});

test("every identity confirmation is bound to its match and round even at the current revision", async () => {
  const t = await table();
  try {
    await start(t.rooms);
    const identity = await restoreIdentity(
      JSON.parse(t.stores[1].getItem(SAVE)!).identity,
    );
    const hostIdentity = JSON.parse(t.stores[0].getItem(SAVE)!).identity;
    const request = {
      kind: "request",
      id: crypto.randomUUID(),
      version: t.host.getSnapshot().revision,
      orientationRound: -1,
      orientationMatch: t.host.getSnapshot().game!.matchId,
      name: "spoof",
      command: { type: "action", action: { type: "confirmRole" } },
    };
    const hostPublic = (await restoreIdentity(hostIdentity)).publicKey;
    const body = await seal(
      await sharedKey(identity, hostPublic),
      request,
      `913574:${identity.id}:${t.host.getSnapshot().meId}`,
    );
    const revision = t.host.getSnapshot().revision;
    t.wire.broadcast({
      v: 1,
      type: "cipher",
      from: identity.id,
      to: t.host.getSnapshot().meId,
      publicKey: identity.publicKey,
      body,
    });
    await until(() =>
      JSON.parse(t.stores[0].getItem(SAVE)!).receipts[identity.id]?.some(
        (r: any) => r.id === request.id,
      ),
    );
    assert.equal(t.host.getSnapshot().revision, revision);
    assert(
      !t.host.getSnapshot().game!.players.find((p) => p.id === identity.id)!
        .confirmed,
    );
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("restored guest preserves revision and host clock against replayed reading snapshots", async () => {
  const t = await table();
  try {
    await start(t.rooms);
    await Promise.all(t.rooms.map((r) => r.act({ type: "confirmRole" })));
    await sync(t.rooms);
    await t.host.act({ type: "beginRead" });
    await sync(t.rooms);
    const old = t.wire.packets
      .filter(
        (p) =>
          p.type === "cipher" &&
          p.from === t.host.getSnapshot().meId &&
          p.to === t.rooms[1].getSnapshot().meId,
      )
      .at(-1);
    t.advance(9000);
    await until(() => t.rooms[1].getSnapshot().game?.phase === "discussion");
    const revision = t.rooms[1].getSnapshot().revision,
      offset = t.rooms[1].getSnapshot().clockOffsetMs;
    t.rooms[1].stop();
    t.wire.drop = (p) => p.from === t.host.getSnapshot().meId;
    const restored = await restoreRoom(t.options(1));
    assert(restored);
    t.rooms[1] = restored;
    await restored.connect();
    t.wire.broadcast(old);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(restored.getSnapshot().revision, revision);
    assert.equal(restored.getSnapshot().clockOffsetMs, offset);
    assert.equal(restored.getSnapshot().game?.phase, "discussion");
    assert.equal(restored.getSnapshot().game?.me.answer, null);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("full match rematch reloads bank with finished-only host settings and three ready online seats", async () => {
  const t = await table();
  try {
    await assert.rejects(t.host.startGame(), /准备/);
    await start(t.rooms);
    await assert.rejects(
      t.host.configure({ ...t.host.getSnapshot().settings, readSeconds: 5 }),
      /对局/,
    );
    let rounds = 0;
    while (t.host.getSnapshot().game!.phase !== "finished") {
      assert(rounds++ < 10);
      await Promise.all(t.rooms.map((r) => r.act({ type: "confirmRole" })));
      await sync(t.rooms);
      await t.host.act({ type: "beginRead" });
      await sync(t.rooms);
      t.advance(9000);
      await until(() =>
        t.rooms.every((r) => r.getSnapshot().game?.phase === "discussion"),
      );
      const thinker = t.rooms.find(
        (r) => r.getSnapshot().meId === t.host.getSnapshot().game!.thinkerId,
      )!;
      const truth = t.rooms.find(
        (r) => r.getSnapshot().game!.me.role === "truth",
      )!;
      await thinker.act({ type: "guess", target: truth.getSnapshot().meId });
      await sync(t.rooms);
      await t.host.act({ type: "next" });
      await sync(t.rooms);
    }
    const match = t.host.getSnapshot().game!.matchId;
    const newcomer = await joinRoom(
      "newcomer",
      "913574",
      t.host.getSnapshot().pin,
      {
        store: new Memory(),
        transport: t.wire.factory,
        now: () => 100000,
        tickMs: 25,
      },
    );
    t.rooms.push(newcomer);
    await newcomer.connect();
    await until(() => newcomer.getSnapshot().status === "online");
    assert.equal(newcomer.getSnapshot().game, null);
    await newcomer.ready(true);
    await sync(t.rooms);
    await t.host.configure({
      ...t.host.getSnapshot().settings,
      readSeconds: 5,
    });
    await sync(t.rooms);
    await t.host.rematch();
    await sync(t.rooms);
    assert.equal(t.loads, 2);
    assert.equal(t.host.getSnapshot().game!.phase, "roles");
    assert.equal(t.host.getSnapshot().game!.readSeconds, 5);
    assert.notEqual(t.host.getSnapshot().game!.matchId, match);
    assert(t.host.getSnapshot().game!.players.every((p) => p.score === 3));
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("old authenticated chat cannot replay after display history and receipt eviction or host restore", async () => {
  const t = await table();
  try {
    await t.rooms[1].sendChat("original");
    const original = t.wire.packets
      .filter(
        (p) => p.type === "cipher" && p.from === t.rooms[1].getSnapshot().meId,
      )
      .at(-1);
    for (let i = 0; i < 52; i++) {
      t.advance(900);
      await t.rooms[1].sendChat(`later${i}`);
    }
    const seq = t.host.getSnapshot().chat.at(-1)!.seq;
    t.advance(900);
    t.wire.broadcast(original);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(t.host.getSnapshot().chat.at(-1)!.seq, seq);
    t.host.stop();
    const restored = await restoreRoom(t.options(0));
    assert(restored);
    t.rooms[0] = restored;
    await restored.connect();
    t.wire.broadcast(original);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(restored.getSnapshot().chat.at(-1)!.seq, seq);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});

test("last reading snapshot cannot reset the persisted clock after a two-minute offline restore", async () => {
  const t = await table();
  try {
    await start(t.rooms);
    await Promise.all(t.rooms.map((r) => r.act({ type: "confirmRole" })));
    await sync(t.rooms);
    await t.host.act({ type: "beginRead" });
    await sync(t.rooms);
    const guest =
      t.rooms.find(
        (r) => r !== t.host && r.getSnapshot().game!.me.role === "truth",
      ) ?? t.rooms[1];
    const index = t.rooms.indexOf(guest),
      offset = guest.getSnapshot().clockOffsetMs,
      revision = guest.getSnapshot().revision;
    const old = t.wire.packets
      .filter(
        (p) =>
          p.type === "cipher" &&
          p.to === guest.getSnapshot().meId &&
          p.from === t.host.getSnapshot().meId,
      )
      .at(-1);
    t.rooms.forEach((r) => r.stop());
    t.advance(120000);
    const restored = await restoreRoom(t.options(index));
    assert(restored);
    t.rooms[index] = restored;
    await restored.connect();
    t.wire.broadcast(old);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(restored.getSnapshot().clockOffsetMs, offset);
    assert.equal(restored.getSnapshot().revision, revision);
    assert.equal(restored.getSnapshot().game!.me.answer, null);
  } finally {
    t.rooms.forEach((r) => r.stop());
  }
});
test("explicit corrupt-record recovery compares the captured value before removal", () => {
  const store = new Memory();
  store.setItem(SAVE, "broken");
  const captured = savedRoomRecord({ store });
  store.setItem(SAVE, "newer identity");
  assert.throws(() => clearSavedRoom({ store }, captured), /变化/);
  assert.equal(store.getItem(SAVE), "newer identity");
  store.setItem(SAVE, "broken");
  clearSavedRoom({ store });
  assert.equal(store.getItem(SAVE), null);
});

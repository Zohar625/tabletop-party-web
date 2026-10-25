import test from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  joinRoom,
  restoreRoom,
} from "../src/games/cartographers/room.ts";
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
  all: { code: string; t: RoomTransport }[] = [];
  packets: any[] = [];
  factory = (code: string): RoomTransport => {
    let open = false;
    const t: RoomTransport = {
      onMessage: () => {},
      onOffline: () => {},
      async connect() {
        open = true;
      },
      close() {
        open = false;
      },
      send: (v) => {
        if (!open) throw Error("closed");
        this.packets.push(structuredClone(v));
        for (const p of this.all.filter((p) => p.code === code))
          queueMicrotask(() => p.t.onMessage(structuredClone(v)));
      },
    };
    this.all.push({ code, t });
    return t;
  };
}
async function until(fn: () => boolean) {
  for (let i = 0; i < 200; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert(fn(), "同步未完成");
}
test("map room supports two players, encrypted public view and guest restore", async () => {
  const wire = new Wire(),
    stores = [new Memory(), new Memory()];
  const opt = (i: number) => ({
    store: stores[i],
    transport: wire.factory,
    tickMs: 30,
  });
  const h = await createRoom("房主", opt(0));
  const g = await joinRoom(
    "客人",
    h.getSnapshot().code,
    h.getSnapshot().pin,
    opt(1),
  );
  let again: any;
  try {
    await Promise.all([h.connect(), g.connect()]);
    await until(() => h.getSnapshot().peers.length === 2);
    await g.ready(true);
    await until(() => !g.getSnapshot().pending);
    await h.startGame();
    await until(() => !!g.getSnapshot().game);
    assert.equal(g.getSnapshot().game!.players.length, 2);
    assert.equal("deck" in g.getSnapshot().game!, false);
    assert.equal("seed" in h.getSnapshot().game!, false);
    assert(!JSON.stringify(wire.packets).includes('"cells"'));
    g.stop();
    again = await restoreRoom(opt(1));
    await again.connect();
    await until(() => !!again.getSnapshot().game);
    assert.equal(again.getSnapshot().meId, g.getSnapshot().meId);
    assert.equal(
      JSON.parse(stores[1].getItem("tabletop.cartographers.room.v1")!).game,
      null,
    );
  } finally {
    h.stop();
    g.stop();
    again?.stop();
  }
});
import { placementError } from "../src/games/cartographers/engine.ts";
import type {
  MapView,
  Placement,
  Terrain,
} from "../src/games/cartographers/types.ts";
function legalMove(game: MapView, id: string): Placement {
  const card = game.current;
  for (const terrain of card.terrains)
    for (let shape = 0; shape < card.shapes.length; shape++)
      for (let rotation = 0; rotation < 4; rotation++)
        for (const mirrored of [false, true])
          for (let y = 0; y < 11; y++)
            for (let x = 0; x < 11; x++) {
              const move = { shape, terrain, x, y, rotation, mirrored };
              if (!placementError(game, id, move)) return move;
            }
  for (const terrain of (card.kind === "ambush"
    ? ["monster"]
    : ["forest", "village", "farm", "water", "monster"]) as Terrain[])
    for (let y = 0; y < 11; y++)
      for (let x = 0; x < 11; x++) {
        const move = {
          shape: 0,
          terrain,
          x,
          y,
          rotation: 0,
          mirrored: false,
          fallback: true,
        };
        if (!placementError(game, id, move)) return move;
      }
  return {
    shape: 0,
    terrain: "forest",
    x: -1,
    y: -1,
    rotation: 0,
    mirrored: false,
    fallback: true,
  };
}
test("three map clients can submit the same turn together without stale-version rejection", async () => {
  const wire = new Wire(),
    stores = [new Memory(), new Memory(), new Memory()];
  const opt = (i: number) => ({
    store: stores[i],
    transport: wire.factory,
    tickMs: 35,
  });
  const h = await createRoom("房主", opt(0));
  const a = await joinRoom(
      "甲",
      h.getSnapshot().code,
      h.getSnapshot().pin,
      opt(1),
    ),
    b = await joinRoom("乙", h.getSnapshot().code, h.getSnapshot().pin, opt(2));
  const rooms = [h, a, b];
  try {
    await Promise.all(rooms.map((r) => r.connect()));
    await until(() => rooms.every((r) => r.getSnapshot().peers.length === 3));
    await Promise.all([a.ready(true), b.ready(true)]);
    await until(() => [a, b].every((r) => !r.getSnapshot().pending));
    await h.startGame();
    await until(() => rooms.every((r) => !!r.getSnapshot().game));
    const turn = h.getSnapshot().game!.turn;
    const moves = rooms.map((r) =>
      legalMove(r.getSnapshot().game!, r.getSnapshot().meId),
    );
    await Promise.all(
      rooms.map((r, i) => r.act({ type: "place", placement: moves[i] })),
    );
    await until(() =>
      rooms.every(
        (r) => !r.getSnapshot().pending && r.getSnapshot().game!.turn > turn,
      ),
    );
    assert(rooms.every((r) => r.getSnapshot().error === ""));
    assert(
      rooms.every((r) =>
        r
          .getSnapshot()
          .game!.players.every((p) => p.board.cells.filter(Boolean).length > 5),
      ),
    );
    const receiptCount = JSON.parse(
      stores[0].getItem("tabletop.cartographers.room.v1")!,
    ).revision;
    assert(receiptCount > 0);
  } finally {
    rooms.forEach((r) => r.stop());
  }
});

test("leaving an offline unopened guest room clears only its own saved seat", async () => {
  const store = new Memory(),
    wire = new Wire();
  const guest = await joinRoom("暂不参加", "123456", "", {
    store,
    transport: wire.factory,
  });
  await guest.leave();
  assert.equal(store.getItem("tabletop.cartographers.room.v1"), null);
});

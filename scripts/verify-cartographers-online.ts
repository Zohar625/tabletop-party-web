import assert from "node:assert/strict";
import {
  createRoom,
  joinRoom,
  restoreRoom,
} from "../src/games/cartographers/room.ts";
import { placementError } from "../src/games/cartographers/engine.ts";
import type { MapRoom } from "../src/games/cartographers/room.ts";
import type {
  MapView,
  Placement,
  Terrain,
} from "../src/games/cartographers/types.ts";
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
async function until(fn: () => boolean, label: string) {
  for (let i = 0; i < 500; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error(`超时：${label}`);
}
function legalMove(game: MapView, id: string): Placement {
  for (const terrain of game.current.terrains)
    for (let shape = 0; shape < game.current.shapes.length; shape++)
      for (let rotation = 0; rotation < 4; rotation++)
        for (const mirrored of [false, true])
          for (let y = 0; y < 11; y++)
            for (let x = 0; x < 11; x++) {
              const p = { shape, terrain, x, y, rotation, mirrored };
              if (!placementError(game, id, p)) return p;
            }
  for (const terrain of (game.current.kind === "ambush"
    ? ["monster"]
    : ["forest", "village", "farm", "water", "monster"]) as Terrain[])
    for (let y = 0; y < 11; y++)
      for (let x = 0; x < 11; x++) {
        const p = {
          shape: 0,
          terrain,
          x,
          y,
          rotation: 0,
          mirrored: false,
          fallback: true,
        };
        if (!placementError(game, id, p)) return p;
      }
  throw Error("本次网络测试地图无法放置");
}
const rooms: MapRoom[] = [];
try {
  const stores = [new Memory(), new Memory(), new Memory()];
  const h = await createRoom("制图验收房主", { store: stores[0] });
  rooms.push(h);
  const a = await joinRoom(
      "制图验收甲",
      h.getSnapshot().code,
      h.getSnapshot().pin,
      { store: stores[1] },
    ),
    b = await joinRoom(
      "制图验收乙",
      h.getSnapshot().code,
      h.getSnapshot().pin,
      { store: stores[2] },
    );
  rooms.push(a, b);
  await Promise.all(rooms.map((r) => r.connect()));
  await until(
    () => rooms.every((r) => r.getSnapshot().peers.length === 3),
    "三人入室",
  );
  await Promise.all([a.ready(true), b.ready(true)]);
  await until(() => [a, b].every((r) => !r.getSnapshot().pending), "准备");
  await h.startGame();
  await until(() => rooms.every((r) => !!r.getSnapshot().game), "开局");
  assert.match(h.getSnapshot().code, /^\d{6}$/);
  console.log("PASS 三个真实网络客户端通过数字房间码入室并共享目标");
  for (let i = 0; i < 2; i++) {
    const turn = h.getSnapshot().game!.turn;
    await until(
      () => rooms.every((r) => r.getSnapshot().game!.turn === turn),
      "相同探索",
    );
    const moves = rooms.map((r) =>
      legalMove(r.getSnapshot().game!, r.getSnapshot().meId),
    );
    await Promise.all(
      rooms.map((r, i) => r.act({ type: "place", placement: moves[i] })),
    );
    await until(
      () =>
        rooms.every(
          (r) => !r.getSnapshot().pending && r.getSnapshot().game!.turn > turn,
        ),
      "同时落笔",
    );
    assert(rooms.every((r) => !r.getSnapshot().error));
  }
  console.log("PASS 连续两次同时落笔，不因其他玩家提交而报过期");
  assert(!("deck" in a.getSnapshot().game!));
  assert(!("seed" in h.getSnapshot().game!));
  console.log("PASS 未来牌序不进入客户端公开投影");
  a.stop();
  const again = await restoreRoom({ store: stores[1] });
  assert(again);
  rooms.push(again);
  await again.connect();
  await until(() => !!again.getSnapshot().game, "成员恢复");
  assert.equal(again.getSnapshot().meId, a.getSnapshot().meId);
  const turn = h.getSnapshot().game!.turn;
  h.stop();
  const owner = await restoreRoom({ store: stores[0] });
  assert(owner);
  rooms.push(owner);
  await owner.connect();
  await until(
    () => owner.getSnapshot().peers.every((p) => p.online),
    "房主恢复",
  );
  assert.equal(owner.getSnapshot().game!.turn, turn);
  console.log("PASS 成员与房主恢复后身份、地图和探索进度一致");
} finally {
  rooms.forEach((r) => r.stop());
}

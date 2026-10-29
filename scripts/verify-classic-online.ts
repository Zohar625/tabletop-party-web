import assert from "node:assert/strict";
import {
  createRoom,
  joinRoom,
  restoreRoom,
} from "../src/games/bluff-classic/room.ts";
import type { ClassicRoom } from "../src/games/bluff-classic/room.ts";
import { MqttTransport } from "../src/games/dinner/mqtt.ts";
import {
  restoreIdentity,
  sharedKey,
  unseal,
} from "../src/games/dinner/crypto.ts";
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
const rooms: ClassicRoom[] = [];
const stores = [new Memory(), new Memory(), new Memory()];
const frames: { frame: any; sentAt: number }[] = [];
const transport = (code: string) => {
  const wire = new MqttTransport(code, "tabletop-bluff-classic");
  const send = wire.send.bind(wire);
  wire.send = (value) => {
    frames.push({ frame: structuredClone(value), sentAt: Date.now() });
    send(value);
  };
  return wire;
};
async function until(check: () => boolean, label: string) {
  const end = Date.now() + 25000;
  while (!check() && Date.now() < end)
    await new Promise((r) => setTimeout(r, 50));
  assert(check(), `Timed out: ${label}`);
}
async function sync(label: string) {
  await until(
    () =>
      rooms.every(
        (r) =>
          r.getSnapshot().status === "online" &&
          !r.getSnapshot().pending &&
          r.getSnapshot().peers.length === 3 &&
          r.getSnapshot().revision === rooms[0].getSnapshot().revision,
      ),
    label,
  );
}
try {
  const host = await createRoom("验收房主", { store: stores[0], transport });
  rooms.push(host);
  for (let i = 1; i < 3; i++)
    rooms.push(
      await joinRoom(
        `验收成员${i}`,
        host.getSnapshot().code,
        host.getSnapshot().pin,
        {
          store: stores[i],
          transport,
          loadCards: async () => {
            throw Error("Guest must never load cards");
          },
        },
      ),
    );
  for (const room of rooms) await room.connect();
  await sync("three independent MQTT clients admitted");
  for (const room of rooms.slice(1)) {
    await room.ready(true);
    await sync("ready");
  }
  await host.configure({ ...host.getSnapshot().settings, readSeconds: 5 });
  await sync("configure");
  await host.startGame();
  await sync("private roles");
  const match = host.getSnapshot().game!.matchId;
  assert.equal(
    new Set(rooms.map((r) => r.getSnapshot().game!.me.role)).size,
    3,
  );
  for (const room of rooms)
    assert.equal(room.getSnapshot().game!.me.answer, null);
  console.log(
    "PASS three independent encrypted MQTT clients, three private roles, host-only bank load",
  );
  const revision = host.getSnapshot().revision;
  await rooms[1].sendChat("联机验收消息");
  await until(
    () => rooms.every((r) => r.getSnapshot().chat.length === 1),
    "authenticated chat",
  );
  assert.equal(host.getSnapshot().revision, revision);
  assert.equal(
    host.getSnapshot().chat[0].authorId,
    rooms[1].getSnapshot().meId,
  );
  await Promise.all(rooms.map((r) => r.act({ type: "confirmRole" })));
  await sync("concurrent confirmations");
  assert(host.getSnapshot().game!.players.every((p) => p.confirmed));
  await host.act({ type: "beginRead" });
  await sync("shared reading window");
  const truth = rooms.find((r) => r.getSnapshot().game!.me.role === "truth")!;
  assert(truth.getSnapshot().game!.me.answer);
  for (const room of rooms)
    if (room !== truth) assert.equal(room.getSnapshot().game!.me.answer, null);
  await until(
    () => rooms.every((r) => r.getSnapshot().game?.phase === "discussion"),
    "fixed reading deadline",
  );
  assert(rooms.every((r) => r.getSnapshot().game!.me.answer === null));
  const thinker = rooms.find(
    (r) => r.getSnapshot().meId === host.getSnapshot().game!.thinkerId,
  )!;
  await thinker.act({ type: "challenge", target: truth.getSnapshot().meId });
  await sync("challenge");
  assert(rooms.every((r) => r.getSnapshot().game!.result === null));
  await thinker.act({ type: "guess", target: truth.getSnapshot().meId });
  await sync("round results");
  assert(host.getSnapshot().game!.result!.correct);
  assert.equal(
    host
      .getSnapshot()
      .game!.result!.lines.find((p) => p.id === thinker.getSnapshot().meId)!
      .delta,
    host.getSnapshot().game!.difficulty - 3,
  );
  console.log(
    "PASS concurrent role confirmation, timed answer privacy, challenge and full round scoring",
  );
  for (const i of [1, 0]) {
    const old = rooms[i],
      id = old.getSnapshot().meId;
    old.stop();
    const restored = await restoreRoom({ store: stores[i], transport });
    assert(restored);
    rooms[i] = restored;
    await restored.connect();
    await sync("restore same seat");
    assert.equal(restored.getSnapshot().meId, id);
    assert.equal(restored.getSnapshot().game!.matchId, match);
    assert.equal(restored.getSnapshot().game!.phase, "results");
  }
  let checked = 0;
  const identities = await Promise.all(
    stores.map(async (store) =>
      restoreIdentity(
        JSON.parse(store.getItem("tabletop.bluff.classic.room.v1")!).identity,
      ),
    ),
  );
  for (const { frame, sentAt } of frames) {
    if (frame.type !== "cipher" || frame.from !== rooms[0].getSnapshot().meId)
      continue;
    const identity = identities.find((i) => i.id === frame.to);
    if (!identity) continue;
    const payload = (await unseal(
      await sharedKey(identity, frame.publicKey),
      frame.body,
      `${rooms[0].getSnapshot().code}:${frame.from}:${frame.to}`,
    )) as any;
    if (payload.kind !== "snapshot" || !payload.game) continue;
    checked++;
    const game = payload.game;
    for (const key of ["truthId", "deck", "question", "seed", "usedConcepts"])
      assert(!(key in game));
    for (const player of game.players) assert(!("role" in player));
    if (game.me.answer) {
      assert.equal(game.me.role, "truth");
      assert.equal(game.phase, "reading");
      assert(sentAt < game.readingDeadline, "expired answer was transmitted");
    }
    if (game.phase !== "reading") assert.equal(game.me.answer, null);
    if (!["results", "finished"].includes(game.phase))
      assert.equal(game.result, null);
  }
  assert(checked >= 6, "insufficient encrypted projection evidence");
  console.log(
    "PASS decrypted per-recipient wire audit: no foreign roles, truth ID, unused bank, seed or expired answer",
  );
  console.log(
    "PASS host and guest restore same identity, round, scores and match",
  );
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Classic online verification failed",
  );
  process.exitCode = 1;
} finally {
  for (const room of rooms) room.stop();
}

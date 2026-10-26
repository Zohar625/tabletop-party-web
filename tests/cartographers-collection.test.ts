import test from "node:test";
import assert from "node:assert/strict";
import {
  collectGame,
  loadAlbum,
  recordSnapshot,
  updateArchiveTitle,
} from "../src/games/cartographers/collection.ts";
import { createBoard } from "../src/games/cartographers/data.ts";
class Memory {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}
test("seasonal snapshots are copied and final collection deduplicates without touching old history", () => {
  const s = new Memory(),
    b = createBoard();
  s.setItem("tabletop.cartographers.history.v1", "old-record");
  recordSnapshot(s, "one", 0, b);
  b.cells[0] = "forest";
  recordSnapshot(s, "one", 1, b);
  const input = {
    id: "one",
    mode: "solo" as const,
    board: b,
    season: 3,
    score: 42,
    rating: { score: 10, title: "熟练地形师" },
    createdAt: "2026-10-25T00:00:00Z",
  };
  let a = collectGame(s, input);
  assert.equal(a.length, 1);
  assert.deepEqual(
    a[0].snapshots.map((p) => p.season),
    [0, 1, 3],
  );
  assert.equal(a[0].snapshots[0].board.cells[0], null);
  b.cells[0] = "water";
  assert.equal(loadAlbum(s)[0].snapshots[2].board.cells[0], "forest");
  assert.equal(collectGame(s, input).length, 1);
  assert.equal(s.getItem("tabletop.cartographers.history.v1"), "old-record");
  updateArchiveTitle(s, "one", " 我的森林 ");
  assert.equal(loadAlbum(s)[0].title, "我的森林");
});
test("album keeps newest 24 records and never fabricates missing seasons for old finished saves", () => {
  const s = new Memory();
  for (let i = 0; i < 26; i++)
    collectGame(s, {
      id: String(i),
      mode: "multi",
      board: createBoard(),
      season: 3,
      score: i,
    });
  const a = loadAlbum(s);
  assert.equal(a.length, 24);
  assert.equal(a[0].id, "25");
  assert.deepEqual(
    a[0].snapshots.map((v) => v.season),
    [3],
  );
});
test("malformed album records do not hide good records or crash gallery", () => {
  const s = new Memory();
  const a = collectGame(s, {
    id: "valid",
    mode: "solo",
    board: createBoard(),
    season: 3,
    score: 1,
  });
  s.setItem("tabletop.cartographers.album.v1", JSON.stringify([{}, ...a]));
  assert.equal(loadAlbum(s).length, 1);
  s.setItem("tabletop.cartographers.album.v1", "{");
  assert.deepEqual(loadAlbum(s), []);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  readSavedGame,
  scoreTotal,
  terrainName,
  fullBoardPlacement,
  canOpenRoom,
  winners,
  previewCells,
} from "../src/games/cartographers/ui-model.ts";
import { createGame } from "../src/games/cartographers/engine.ts";
import { placementError } from "../src/games/cartographers/engine.ts";
test("full-map ambush pass uses monster terrain and passes authoritative validation", () => {
  const g = createGame(
    [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    "full-pass",
    "multi",
  );
  g.current = {
    id: "ambush",
    name: "Ambush",
    kind: "ambush",
    time: 0,
    terrains: ["monster"],
    shapes: [{ cells: [[0, 0]] }],
    direction: 1,
  };
  for (const p of g.players) p.board.cells.fill("forest");
  assert.equal(
    placementError(g, "a", fullBoardPlacement(g.current.kind)),
    null,
  );
  assert.equal(fullBoardPlacement("explore").terrain, "forest");
});
test("an existing room identity cannot be replaced while restoring, connected or playing", () => {
  assert.equal(canOpenRoom(false, false), true);
  assert.equal(canOpenRoom(false, true), false);
  assert.equal(canOpenRoom(true, false), false);
});
test("winner compares total voice then cumulative monster penalty and preserves a joint tie", () => {
  const g = createGame(
    [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ],
    "winners",
    "multi",
  );
  for (const [i, p] of g.players.entries())
    p.seasons = [
      {
        season: 0,
        goals: [10, 10],
        coins: 0,
        monsters: i === 0 ? 4 : 2,
        total: 20,
      },
    ];
  assert.deepEqual(
    winners(g.players).map((p) => p.id),
    ["b", "c"],
  );
  g.players[0].seasons[0].total = 21;
  assert.deepEqual(
    winners(g.players).map((p) => p.id),
    ["a"],
  );
});
test("an unknown goal or malformed saved shape cannot crash a resumed game", () => {
  const valid = createGame(
    [{ id: "solo", name: "Test" }],
    "restore-test",
    "solo",
  );
  assert.ok(readSavedGame(JSON.stringify(valid)));
  const unknown = structuredClone(valid);
  unknown.goals[0] = "foreign-goal";
  assert.equal(readSavedGame(JSON.stringify(unknown)), null);
  const bad = structuredClone(valid);
  bad.current.shapes[0].cells = [];
  assert.equal(readSavedGame(JSON.stringify(bad)), null);
});
test("corrupt or foreign solo saves are rejected without crashing the landing page", () => {
  for (const value of [
    null,
    "{",
    "{}",
    '{"version":1,"mode":"multi"}',
    '{"version":1,"mode":"solo","players":[]}',
  ])
    assert.equal(readSavedGame(value), null);
});
test("score summary includes every completed season and negative scores", () => {
  assert.equal(scoreTotal([{ total: 12 }, { total: -4 }, { total: 8 }]), 16);
});
test("preview retains off-board cells so invalid placements stay visible to validation", () => {
  assert.deepEqual(
    previewCells(
      [
        [0, 0],
        [1, 0],
      ],
      10,
      10,
    ),
    [
      [10, 10],
      [11, 10],
    ],
  );
  assert.equal(terrainName("monster"), "怪物");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { createBoard, CARDS, GOALS } from "../src/games/cartographers/data.ts";
import {
  createGame,
  reduceGame,
  transformedShape,
  gameView,
  placementError,
  targetPlayer,
} from "../src/games/cartographers/engine.ts";
import {
  scoreBoard,
  monsterPenalty,
  soloRating,
  goalHighlights,
} from "../src/games/cartographers/scoring.ts";
import type { Placement, MapGame } from "../src/games/cartographers/types.ts";
const seats = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
];
const place: Placement = {
  shape: 0,
  terrain: "forest",
  x: 0,
  y: 0,
  rotation: 0,
  mirrored: false,
};
function fixed(): MapGame {
  const s = createGame(seats, "test", "multi");
  s.current = {
    id: "test",
    name: "Test",
    kind: "explore",
    time: 1,
    terrains: ["forest"],
    shapes: [{ cells: [[0, 0]] }],
  };
  return s;
}
test("base components have 13 explore cards, four ambushes, sixteen goals and five mountains", () => {
  assert.equal(CARDS.filter((c) => c.kind !== "ambush").length, 13);
  assert.equal(CARDS.filter((c) => c.kind === "ambush").length, 4);
  assert.equal(GOALS.length, 16);
  assert.equal(createBoard().cells.filter((c) => c === "mountain").length, 5);
});
test("rotations and mirrors preserve cells and normalize origin", () => {
  for (let r = 0; r < 4; r++)
    for (const m of [true, false]) {
      const cells = transformedShape(
        [
          [0, 0],
          [1, 0],
          [1, 1],
        ],
        r,
        m,
      );
      assert.equal(new Set(cells.map(String)).size, 3);
      assert.equal(Math.min(...cells.map((p) => p[0])), 0);
      assert.equal(Math.min(...cells.map((p) => p[1])), 0);
    }
});
test("illegal overlapping action is rejected without mutating input", () => {
  const s = fixed();
  const mountain = s.players[0].board.cells.indexOf("mountain");
  const before = structuredClone(s);
  assert.throws(() =>
    reduceGame(s, "a", {
      type: "place",
      placement: { ...place, x: mountain % 11, y: Math.floor(mountain / 11) },
    }),
  );
  assert.deepEqual(s, before);
});
test("players submit independently; turn only advances when all have placed", () => {
  const s = fixed();
  const a = reduceGame(s, "a", { type: "place", placement: place });
  assert.equal(a.turn, s.turn);
  assert.equal(a.players[0].submitted, true);
  assert.equal(a.players[1].submitted, false);
  assert.throws(() =>
    reduceGame(a, "a", { type: "place", placement: { ...place, x: 1 } }),
  );
  const b = reduceGame(a, "b", { type: "place", placement: place });
  assert.equal(b.turn, s.turn + 1);
  assert.equal(s.players[0].board.cells[0], null);
});
test("public view hides deck and seed and ambush targets neighbor", () => {
  const s = fixed();
  const v = gameView(s);
  for (const k of ["seed", "deck", "ambushDeck"]) assert.equal(k in v, false);
  s.current = CARDS.find((c) => c.kind === "ambush")!;
  assert.equal(targetPlayer(s, "a").id, "b");
});
test("edge forests count once, monsters deduplicate adjacent empties", () => {
  const b = createBoard();
  b.cells[0] = "forest";
  b.cells[12] = "forest";
  assert.equal(scoreBoard(b, "sentinel"), 1);
  b.cells.fill(null);
  b.cells[0] = "monster";
  b.cells[2] = "monster";
  assert.equal(monsterPenalty(b), 4);
});
test("solo rating subtracts four goal baselines", () => {
  const goals = GOALS.slice(0, 4);
  const baseline = goals.reduce((n, g) => n + g.base, 0);
  assert.equal(
    soloRating(
      baseline + 30,
      goals.map((g) => g.id),
    ).score,
    30,
  );
  assert.match(
    soloRating(
      baseline + 30,
      goals.map((g) => g.id),
    ).title,
    /传奇/,
  );
});
test("fallback forbidden while normal shape fits and invalid numeric inputs rejected", () => {
  const s = fixed();
  assert.ok(placementError(s, "a", { ...place, fallback: true }));
  assert.ok(placementError(s, "a", { ...place, x: NaN }));
  assert.ok(placementError(s, "a", { ...place, rotation: 0.5 }));
});
test("surrounding a mountain earns one persistent coin only", () => {
  const s = fixed();
  const b = s.players[0].board;
  for (const i of [3, 13, 15]) b.cells[i] = "farm";
  const a = reduceGame(s, "a", {
    type: "place",
    placement: { ...place, x: 3, y: 2 },
  });
  assert.equal(a.players[0].board.coins, 1);
  assert.deepEqual(a.players[0].board.earnedMountains, [14]);
});
test("ruins must be covered; impossible ruins permits any base terrain fallback", () => {
  const s = fixed();
  s.ruins = true;
  assert.ok(placementError(s, "a", place));
  assert.equal(placementError(s, "a", { ...place, x: 5, y: 1 }), null);
  for (const [x, y] of [
    [5, 1],
    [1, 2],
    [9, 2],
    [1, 8],
    [9, 8],
    [5, 9],
  ])
    s.players[0].board.cells[y * 11 + x] = "water";
  assert.equal(
    placementError(s, "a", { ...place, terrain: "monster", fallback: true }),
    null,
  );
});
test("season scoring retains coins and next winter ends after four records", () => {
  const s = fixed();
  s.elapsed = 8;
  s.players[0].board.coins = 2;
  const a = reduceGame(s, "a", { type: "place", placement: place });
  const b = reduceGame(a, "b", { type: "place", placement: place });
  assert.equal(b.phase, "seasonEnd");
  assert.equal(b.players[0].seasons[0].coins, 2);
  assert.equal(b.players[0].board.coins, 2);
  const winter = structuredClone(b);
  winter.season = 3;
  const end = reduceGame(winter, "b", { type: "next" });
  assert.equal(end.phase, "finished");
});
test("village clusters use orthogonal connectivity and tied second largest counts", () => {
  const b = createBoard();
  b.cells.fill(null);
  for (const i of [0, 1, 11, 12, 55, 56, 66, 67]) b.cells[i] = "village";
  assert.equal(scoreBoard(b, "shieldgate"), 8);
  assert.equal(scoreBoard(b, "wildholds"), 0);
  assert.equal(scoreBoard(b, "greatcity"), 4);
});
test("filled squares and bottom-left diagonals score boundaries correctly", () => {
  const b = createBoard();
  b.cells.fill(null);
  for (const i of [0, 1, 11, 12]) b.cells[i] = "farm";
  assert.equal(scoreBoard(b, "barony"), 6);
  b.cells.fill(null);
  b.cells[110] = "forest";
  assert.equal(scoreBoard(b, "brokenroad"), 3);
  b.cells[99] = "forest";
  b.cells[111] = "water";
  assert.equal(scoreBoard(b, "brokenroad"), 6);
});
test("full map accepts explicit pass but never an ordinary placement", () => {
  const s = fixed();
  s.players[0].board.cells.fill("farm");
  assert.equal(
    placementError(s, "a", { ...place, x: -1, y: -1, fallback: true }),
    null,
  );
  assert.ok(placementError(s, "a", place));
});
test("gold track has fourteen spaces and ignores extra coins", () => {
  const s = fixed();
  s.current.shapes[0].coin = true;
  s.players[0].board.coins = 14;
  assert.equal(
    reduceGame(s, "a", { type: "place", placement: place }).players[0].board
      .coins,
    14,
  );
});
test("goal highlight contains scoring forest cells and excludes unrelated forests", () => {
  const b = createBoard();
  b.cells[0] = "forest";
  b.cells[12] = "forest";
  assert.deepEqual(goalHighlights(b, "sentinel"), [0]);
});
test("ruins persists through an automatic solo ambush and fixed orientation starts at printed corner", () => {
  let s = createGame([seats[0]], "ambush", "solo");
  s.current = {
    id: "test",
    name: "Test",
    kind: "explore",
    time: 1,
    terrains: ["forest"],
    shapes: [{ cells: [[0, 0]] }],
  };
  s.elapsed = 0;
  s.deck = ["temple", "goblin", "forest"];
  s = reduceGame(s, "a", { type: "place", placement: place });
  assert.equal(s.current.id, "forest");
  assert.equal(s.ruins, true);
  assert.match(s.lastEvent, /伏击/);
  for (const i of [96, 108, 120])
    assert.equal(s.players[0].board.cells[i], "monster");
});
test("solo ambush checks every outer edge before searching interior anchors", () => {
  let s = createGame([seats[0]], "edge-scan", "solo");
  s.current = {
    id: "test",
    name: "Test",
    kind: "explore",
    time: 1,
    terrains: ["forest"],
    shapes: [{ cells: [[0, 0]] }],
  };
  s.ruins = false;
  s.elapsed = 0;
  s.deck = ["goblin", "forest"];
  const board = s.players[0].board;
  board.cells.fill(null);
  for (let v = 0; v < 11; v++) {
    board.cells[v * 11 + 10] = "farm";
    board.cells[110 + v] = "farm";
  }
  s = reduceGame(s, "a", {
    type: "place",
    placement: { ...place, x: 5, y: 5 },
  });
  assert.deepEqual(
    s.players[0].board.cells.flatMap((t, i) => (t === "monster" ? [i] : [])),
    [7, 19, 31],
  );
});
test("solo impossible ambush is ignored rather than converted into a single monster", () => {
  let s = createGame([seats[0]], "ambush", "solo");
  s.current = {
    id: "test",
    name: "Test",
    kind: "explore",
    time: 1,
    terrains: ["forest"],
    shapes: [{ cells: [[0, 0]] }],
  };
  s.elapsed = 0;
  s.deck = ["goblin", "forest"];
  s.players[0].board.cells.fill("farm");
  s.players[0].board.cells[0] = null;
  s.players[0].board.cells[120] = null;
  s = reduceGame(s, "a", { type: "place", placement: place });
  assert.equal(s.players[0].board.cells[120], null);
  assert.equal(s.players[0].board.cells.includes("monster"), false);
});
test("three-seat ambush modifies received neighbor map and never own map", () => {
  const s = createGame(
    [...seats, { id: "c", name: "C" }],
    "multiambush",
    "multi",
  );
  s.current = CARDS.find((c) => c.id === "goblin")!;
  const t = targetPlayer(s, "a");
  assert.equal(t.id, "b");
  const next = reduceGame(s, "a", {
    type: "place",
    placement: { ...place, terrain: "monster" },
  });
  assert.equal(next.players[1].board.cells[0], "monster");
  assert.equal(next.players[0].board.cells[0], null);
  assert.equal(next.players[0].submitted, true);
});
function legal(s: MapGame, actor: string): Placement {
  for (let shape = 0; shape < s.current.shapes.length; shape++)
    for (let rotation = 0; rotation < 4; rotation++)
      for (const mirrored of [false, true])
        for (let y = 0; y < 11; y++)
          for (let x = 0; x < 11; x++) {
            const p = {
              shape,
              rotation,
              mirrored,
              x,
              y,
              terrain: s.current.terrains[0],
            };
            if (!placementError(s, actor, p)) return p;
          }
  const board = targetPlayer(s, actor).board,
    i = board.cells.indexOf(null);
  return {
    ...place,
    terrain: s.current.kind === "ambush" ? "monster" : "forest",
    fallback: true,
    x: i < 0 ? -1 : i % 11,
    y: i < 0 ? -1 : Math.floor(i / 11),
  };
}
test("seeded solo and multiplayer games complete four seasons and restored states advance identically", () => {
  for (const mode of ["solo", "multi"] as const)
    for (let seed = 0; seed < 4; seed++) {
      let s = createGame(
        mode === "solo" ? [seats[0]] : seats,
        String(seed),
        mode,
      );
      assert.deepEqual(
        s,
        createGame(mode === "solo" ? [seats[0]] : seats, String(seed), mode),
      );
      let actions = 0;
      while (s.phase !== "finished") {
        assert.ok(actions++ < 200);
        const actor = s.players.find((p) => !p.submitted)?.id ?? "a";
        const action =
          s.phase === "seasonEnd"
            ? { type: "next" as const }
            : { type: "place" as const, placement: legal(s, actor) };
        const restored = JSON.parse(JSON.stringify(s));
        s = reduceGame(s, actor, action);
        assert.deepEqual(s, reduceGame(restored, actor, action));
      }
      for (const p of s.players) {
        assert.equal(p.seasons.length, 4);
        assert.ok(p.board.coins <= 14);
      }
    }
});

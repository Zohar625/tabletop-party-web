import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseRange,
  selectionKey,
  previewInsert,
  unreadEvents,
  selectionMessage,
  roomStatusText,
} from "../src/games/scout/ui-model.ts";
import {
  lessonState,
  teachingStep,
  lessons,
} from "../src/games/scout/tutorial-model.ts";
import { createScout, scoutView } from "../src/games/scout/engine.ts";
const cards = [3, 8, 4, 5, 9].map((top, i) => ({
  id: `h${i}`,
  top,
  bottom: 10 - i,
}));
test("range selection includes intervening cards and resets when clicking a single selected card", () => {
  assert.deepEqual(chooseRange(null, 0), { anchor: 0, end: 0 });
  assert.deepEqual(chooseRange({ anchor: 0, end: 0 }, 3), {
    anchor: 0,
    end: 3,
  });
  assert.deepEqual(chooseRange({ anchor: 3, end: 3 }, 1), {
    anchor: 3,
    end: 1,
  });
  assert.equal(chooseRange({ anchor: 2, end: 2 }, 2), null);
  assert.match(selectionMessage(cards.slice(0, 4), null), /同点数|顺子/);
  assert.match(
    selectionMessage(cards.slice(2, 4), [{ id: "s", top: 9, bottom: 1 }]),
    /可以演出/,
  );
});
test("selection survives public score snapshots but resets on turn, hand orientation or match", () => {
  const g = scoutView(
    createScout(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      "selection",
    ),
    "a",
  );
  const key = selectionKey(g);
  g.revision++;
  g.players[1].total++;
  assert.equal(selectionKey(g), key);
  g.turnId = g.turnId === "a" ? "b" : "a";
  assert.notEqual(selectionKey(g), key);
  const previous = selectionKey(g);
  g.me.hand[0].top++;
  assert.notEqual(selectionKey(g), previous);
});
test("Scout preview only inserts one oriented card and never changes original hand order", () => {
  const before = JSON.stringify(cards);
  const result = previewInsert(
    cards,
    { id: "edge", top: 6, bottom: 4 },
    true,
    2,
  );
  assert.deepEqual(
    result.map((c) => c.id),
    ["h0", "h1", "edge", "h2", "h3", "h4"],
  );
  assert.equal(result[2].top, 4);
  assert.equal(JSON.stringify(cards), before);
});
test("committed events baseline on mount and never repeat for persisted snapshots", () => {
  const events = [
    { seq: 8, kind: "show" as const, actorId: "a" },
    { seq: 9, kind: "scout" as const, actorId: "b" },
  ];
  assert.deepEqual(unreadEvents(null, "match", 9, events).events, []);
  const first = unreadEvents({ matchId: "match", seq: 8 }, "match", 9, events);
  assert.deepEqual(
    first.events.map((e) => e.seq),
    [9],
  );
  assert.deepEqual(unreadEvents(first.cursor, "match", 9, events).events, []);
  assert.deepEqual(
    unreadEvents(first.cursor, "other", 1, [
      { seq: 1, kind: "deal", actorId: "a" },
    ]).events.map((e) => e.kind),
    ["deal"],
  );
});
test("teaching gates meaningful decisions using actual engine transitions", () => {
  assert.ok(lessons[0].purpose.includes("得分"));
  const orientation = lessonState(0);
  assert.equal(
    teachingStep(0, orientation, { type: "orient", flip: false }).complete,
    false,
  );
  assert.equal(
    teachingStep(0, orientation, { type: "orient", flip: true }).complete,
    true,
  );
  const run = lessonState(1);
  assert.equal(
    teachingStep(1, run, { type: "show", start: 0, count: 4 }).complete,
    false,
  );
  assert.equal(
    teachingStep(1, run, { type: "show", start: 2, count: 2 }).complete,
    true,
  );
  const bridge = teachingStep(2, lessonState(2), {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 1,
    combo: false,
  });
  assert.equal(bridge.complete, true);
  assert.deepEqual(
    bridge.state.players[0].hand.map((c) => c.top),
    [3, 4, 5, 8],
  );
  assert.equal(bridge.state.turnId, "b");
  const combo = teachingStep(5, lessonState(5), {
    type: "scout",
    side: "left",
    flip: false,
    insertIndex: 1,
    combo: true,
  });
  assert.equal(combo.complete, false);
  assert.equal(combo.state.turnId, "a");
  assert.equal(
    teachingStep(5, combo.state, { type: "show", start: 0, count: 3 }).complete,
    true,
  );
  const score = teachingStep(6, lessonState(6), {
    type: "show",
    start: 0,
    count: 2,
  });
  assert.equal(score.complete, true);
  assert.equal(score.state.history.length, 1);
  assert.equal(score.state.history[0].lines[0].delta, 7);
  const closure = teachingStep(3, lessonState(3), {
    type: "show",
    start: 1,
    count: 2,
  });
  assert.deepEqual(
    closure.state.players[0].hand.map((c) => c.top),
    [2, 3, 4, 9],
  );
  assert.equal(
    teachingStep(4, lessonState(4), { type: "show", start: 0, count: 3 })
      .complete,
    true,
  );
});
test("each teaching fixture uses distinct physical cards from the three-player deck", () => {
  lessons.forEach((_, i) => {
    const s = lessonState(i),
      cards = [...s.players.flatMap((p) => p.hand), ...(s.active?.cards ?? [])];
    assert.ok(
      cards.every(
        (c) =>
          c.top !== c.bottom &&
          c.top >= 1 &&
          c.top <= 9 &&
          c.bottom >= 1 &&
          c.bottom <= 9,
      ),
    );
    assert.equal(
      new Set(
        cards.map((c) => [c.top, c.bottom].sort((a, b) => a - b).join("/")),
      ).size,
      cards.length,
    );
    assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  });
});
test("room status distinguishes disconnected from waiting for host", () => {
  assert.match(roomStatusText("offline"), /断开/);
  assert.match(roomStatusText("waiting"), /房主/);
});
test("SSR keeps opponent hands private and includes teaching, hand and room labels", async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { ScoutTable } = await server.ssrLoadModule(
      "/src/games/scout/ScoutTable.tsx",
    );
    const { default: ScoutApp } = await server.ssrLoadModule(
      "/src/games/scout/ScoutApp.tsx",
    );
    const s = lessonState(1);
    s.players[1].hand[0] = { id: "OPPONENT-SECRET", top: 87, bottom: 94 };
    const html = renderToStaticMarkup(
      React.createElement(ScoutTable, {
        game: scoutView(s, "a"),
        actor: "a",
        onAction: () => {},
      }),
    );
    assert.match(html, /你的手牌/);
    assert.match(html, /连续/);
    assert.doesNotMatch(html, /OPPONENT-SECRET|>87<|>94</);
    const landing = renderToStaticMarkup(React.createElement(ScoutApp));
    assert.match(landing, /创建房间/);
    assert.match(landing, /加入房间/);
    assert.match(landing, /学会再开场/);
  } finally {
    await server.close();
  }
});

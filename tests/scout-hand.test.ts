import test from "node:test";
import assert from "node:assert/strict";
import { stackedGroups } from "../src/games/scout/ui-model.ts";
import { automaticAction } from "../src/games/scout/turn-clock.ts";
test("offline seats disable rematch without disabling the next round", async () => {
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
    let s = createScout(
      [
        { id: "a", name: "甲" },
        { id: "b", name: "乙" },
      ],
      "rematch-gate",
    );
    while (s.phase !== "finished") {
      if (s.phase === "orienting") {
        for (const p of s.players)
          if (!p.orientationConfirmed)
            s = reduceScout(s, p.id, { type: "orient", flip: false });
      } else if (s.phase === "roundEnd")
        s = reduceScout(s, "a", { type: "next" });
      else s = reduceScout(s, s.turnId, automaticAction(s)!);
    }
    const render = (phase: string) =>
      renderToStaticMarkup(
        React.createElement(ScoutTable, {
          game: { ...scoutView(s, "a"), phase },
          actor: "a",
          onAction: () => {},
          isHost: true,
          onRematch: () => {},
          rematchReady: false,
        }),
      );
    assert.match(
      render("finished"),
      /<button[^>]*disabled=""[^>]*>再巡演一局<\/button>/,
    );
    assert.match(render("roundEnd"), /<button[^>]*>开启下一轮<\/button>/);
    assert.doesNotMatch(
      render("roundEnd"),
      /<button[^>]*disabled=""[^>]*>开启下一轮<\/button>/,
    );
  } finally {
    await server.close();
  }
});
import {
  createScout,
  reduceScout,
  scoutView,
} from "../src/games/scout/engine.ts";
test("only the acting player's hand container and action dock get local turn emphasis", async () => {
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
    let s = createScout(
      [
        { id: "a", name: "甲" },
        { id: "b", name: "乙" },
      ],
      "hand-highlight",
    );
    for (const p of s.players)
      s = reduceScout(s, p.id, { type: "orient", flip: false });
    const render = (actor: string) =>
      renderToStaticMarkup(
        React.createElement(ScoutTable, {
          game: scoutView(s, actor),
          actor,
          onAction: () => {},
        }),
      );
    const own = render(s.turnId),
      other = render(s.players.find((p) => p.id !== s.turnId)!.id);
    assert.match(own, /sc-hand-section is-my-turn/);
    assert.match(own, /sc-action-dock is-my-turn/);
    assert.match(own, /轮到你出牌/);
    assert.doesNotMatch(other, /sc-hand-section is-my-turn/);
  } finally {
    await server.close();
  }
});
test("stacked overview keeps every card in one row without changing order", () => {
  const cards = Array.from({ length: 12 }, (_, i) => ({
    id: String(i),
    top: (i % 9) + 1,
    bottom: 10,
  }));
  const before = JSON.stringify(cards),
    groups = stackedGroups(cards);
  assert.deepEqual(
    groups.map((g) => g.length),
    [12],
  );
  assert.deepEqual(
    groups.flat().map((c) => c.id),
    cards.map((c) => c.id),
  );
  assert.equal(JSON.stringify(cards), before);
  assert.deepEqual(
    stackedGroups(cards.slice(0, 7)).map((g) => g.length),
    [7],
  );
});
test("card small indices describe the opposite direction and only six/nine have underline markers", async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { CardFace, AbilityToken } = await server.ssrLoadModule(
      "/src/games/scout/Card.tsx",
    );
    const card = (top: number, bottom: number) =>
      renderToStaticMarkup(
        React.createElement(CardFace, { card: { id: "test", top, bottom } }),
      );
    const indices = (html: string) =>
      [...html.matchAll(/class="sc-face-index"[^>]*>(\d+)<\/text>/g)].map((m) =>
        Number(m[1]),
      );
    assert.deepEqual(indices(card(3, 8)), [8, 3]);
    assert.deepEqual(indices(card(8, 3)), [3, 8]);
    assert.equal((card(3, 8).match(/class="sc-face-rule"/g) ?? []).length, 0);
    assert.equal((card(6, 9).match(/class="sc-face-rule"/g) ?? []).length, 2);
    assert.match(
      renderToStaticMarkup(
        React.createElement(AbilityToken, { available: true }),
      ),
      /挖角并演出：可用/,
    );
    assert.match(
      renderToStaticMarkup(
        React.createElement(AbilityToken, { available: false }),
      ),
      /挖角并演出：已使用/,
    );
  } finally {
    await server.close();
  }
});

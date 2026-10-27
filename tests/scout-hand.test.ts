import test from "node:test";
import assert from "node:assert/strict";
import { stackedGroups } from "../src/games/scout/ui-model.ts";
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

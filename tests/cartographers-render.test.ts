import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
test("map and tutorial expose labeled previews, explicit confirmation and gated lesson navigation", async () => {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { default: Tutorial, lessonGame } = await server.ssrLoadModule(
      "/src/games/cartographers/Tutorial.tsx",
    );
    const { reduceGame } = await server.ssrLoadModule(
      "/src/games/cartographers/engine.ts",
    );
    const html = renderToStaticMarkup(
      createElement(Tutorial, { onExit() {}, onStart() {} }),
    );
    assert.match(html, /A1，空地/);
    assert.match(html, /放大地图/);
    assert.match(html, /确认落笔/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>下一课/);
    assert.equal((html.match(/class="ct-cell /g) || []).length, 121);
    for (let step = 0; step < 8; step++) {
      const before = lessonGame(step);
      const after = reduceGame(before, "student", {
        type: "place",
        placement: {
          shape: 0,
          terrain: step === 6 ? "monster" : step === 4 ? "farm" : "forest",
          rotation: step === 1 ? 1 : 0,
          mirrored: false,
          x: step === 3 ? 4 : step === 5 ? 5 : 0,
          y: step === 3 ? 3 : step === 5 ? 1 : 0,
        },
      });
      if (step === 3)
        assert.equal(
          after.players[0].board.coins,
          before.players[0].board.coins + 1,
        );
      if (step === 6) {
        assert.equal(after.players[1].board.cells[0], "monster");
        assert.equal(after.players[0].board.cells[0], null);
      }
      if (step === 7) assert.equal(after.phase, "seasonEnd");
    }
    const constrained = lessonGame(5, true);
    assert.throws(() =>
      reduceGame(constrained, "student", {
        type: "place",
        placement: {
          shape: 0,
          terrain: "forest",
          rotation: 0,
          mirrored: false,
          x: 0,
          y: 0,
        },
      }),
    );
    const rescued = reduceGame(constrained, "student", {
      type: "place",
      placement: {
        shape: 0,
        terrain: "forest",
        rotation: 0,
        mirrored: false,
        x: 0,
        y: 0,
        fallback: true,
      },
    });
    assert.equal(rescued.players[0].board.cells[0], "forest");
  } finally {
    await server.close();
  }
});

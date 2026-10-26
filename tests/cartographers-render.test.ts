import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
test("purpose-first lesson exposes causal goal, unbanked score and gated navigation before tools", async () => {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { default: Tutorial } = await server.ssrLoadModule(
      "/src/games/cartographers/Tutorial.tsx",
    );
    const html = renderToStaticMarkup(
      createElement(Tutorial, { onExit() {}, onStart() {} }),
    );
    assert.match(html, /四季/);
    assert.match(html, /边缘 → A 预计 \+1/);
    assert.match(html, /内部 → A 预计 \+0/);
    assert.match(html, /季末才到账/);
    assert.match(html, /确认落笔/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>下一步/);
    assert.match(html, /冒险者协会委托板/);
    assert.match(html, /哨兵林/);
    assert.doesNotMatch(html, /⇄ 镜像|无法放下？使用单格替代/);
    assert.equal((html.match(/class="ct-cell /g) || []).length, 121);
  } finally {
    await server.close();
  }
});
test("guild highlights both active commissions and names actual next seasons; report explains score sources", async () => {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { GameTable } = await server.ssrLoadModule(
      "/src/games/cartographers/GameTable.tsx",
    );
    const { lessonGame } = await server.ssrLoadModule(
      "/src/games/cartographers/tutorial-model.ts",
    );
    const game = lessonGame(0);
    game.season = 1;
    let html = renderToStaticMarkup(
      createElement(GameTable, { game, actor: "student", onAction() {} }),
    );
    assert.equal(
      (html.match(/class="ctguild-paper ctguild-active/g) || []).length,
      2,
    );
    assert.match(html, /下次：寒冬/);
    assert.match(html, /下次：金秋/);
    game.phase = "seasonEnd";
    game.players[0].seasons = [
      { season: 1, goals: [2, 3], coins: 1, monsters: 2, total: 4 },
    ];
    html = renderToStaticMarkup(
      createElement(GameTable, { game, actor: "student", onAction() {} }),
    );
    assert.match(html, /已结算声望/);
    assert.match(html, /大都会/);
    assert.match(html, /怪物/);
    assert.match(html, /本季声望来源/);
  } finally {
    await server.close();
  }
});

test("completed teaching keeps causal feedback and progression in the placement panel", async () => {
  const server = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { GameTable } = await server.ssrLoadModule(
      "/src/games/cartographers/GameTable.tsx",
    );
    const { lessonGame } = await server.ssrLoadModule(
      "/src/games/cartographers/tutorial-model.ts",
    );
    const props = {
      game: lessonGame(0),
      actor: "student",
      pending: true,
      teaching: { step: 0 },
      onAction() {},
      completionActions: createElement(
        "div",
        null,
        createElement("p", null, "这次边缘森林让声望预计增加 1 分"),
        createElement("button", null, "继续学习下一步"),
      ),
    };
    const html = renderToStaticMarkup(createElement(GameTable, props));
    const panel = html.slice(html.indexOf('class="ct-placement-panel"'));
    assert.match(panel, /这次边缘森林让声望预计增加 1 分/);
    assert.match(panel, /继续学习下一步/);
    assert.doesNotMatch(panel, /确认落笔/);
    const ordinary = renderToStaticMarkup(
      createElement(GameTable, { ...props, teaching: undefined }),
    );
    assert.match(ordinary, /确认落笔/);
    assert.doesNotMatch(ordinary, /继续学习下一步/);
  } finally {
    await server.close();
  }
});

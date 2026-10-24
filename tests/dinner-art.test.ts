import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { SAFE_DISHES, BAD_DISHES } from "../src/games/dinner/menu.ts";

const source = await readFile(
  new URL("../src/games/dinner/components/DishArt.tsx", import.meta.url),
  "utf8",
);
const output = ts
  .transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
  })
  .outputText.replaceAll(
    '"react/jsx-runtime"',
    JSON.stringify(import.meta.resolve("react/jsx-runtime")),
  )
  .replaceAll(
    '"../dishVisuals.ts"',
    JSON.stringify(
      new URL("../src/games/dinner/dishVisuals.ts", import.meta.url).href,
    ),
  );
const { DishArt } = await import(
  `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
);
const render = (name: string, kind: "safe" | "bad", covered = false) =>
  renderToStaticMarkup(
    createElement(DishArt, { dish: { name, kind }, covered }),
  );

test("uncovered dishes carry an explicit normal/dark label and distinct symbol", () => {
  assert.match(render("红烧肉", "safe"), /正常料理/);
  assert.match(render("红烧肉", "safe"), /data-safety="safe"/);
  assert.match(render("牙膏夹心饼干", "bad"), /黑暗料理/);
  assert.match(render("牙膏夹心饼干", "bad"), /data-safety="bad"/);
});

test("every covered dish has identical markup with no dish, ingredient, or safety leakage", () => {
  const hidden = render("红烧肉", "safe", true);
  for (const name of SAFE_DISHES)
    assert.equal(render(name, "safe", true), hidden);
  for (const name of BAD_DISHES)
    assert.equal(render(name, "bad", true), hidden);
  assert.match(hidden, /aria-label="盖好的料理"/);
  assert.doesNotMatch(
    hidden,
    /正常料理|黑暗料理|data-safety|data-dish-shape|data-ingredient/,
  );
});

test("unknown names and art hints use a neutral question plate", () => {
  const unknown = render("教程示例菜", "safe");
  assert.match(unknown, /data-dish-shape="unknown"/);
  const hint = renderToStaticMarkup(
    createElement(DishArt, {
      dish: { name: "未收录", kind: "safe", art: "fish cake" },
    }),
  );
  assert.match(hint, /data-dish-shape="unknown"/);
});

test("all 40 menu names have explicit food shapes and meaningful ingredients", async () => {
  const { DISH_VISUALS } = await import("../src/games/dinner/dishVisuals.ts");
  assert.deepEqual(
    Object.keys(DISH_VISUALS).sort(),
    [...SAFE_DISHES, ...BAD_DISHES].sort(),
  );
  for (const name of [...SAFE_DISHES, ...BAD_DISHES]) {
    assert.ok(DISH_VISUALS[name].ingredients.length > 0, name);
    assert.match(
      render(
        name,
        BAD_DISHES.includes(name as (typeof BAD_DISHES)[number])
          ? "bad"
          : "safe",
      ),
      new RegExp(`data-dish-shape="${DISH_VISUALS[name].shape}"`),
    );
  }
  const expected = {
    红烧肉: "chunks",
    清蒸鲈鱼: "fish",
    香煎三文鱼: "salmon",
    白灼虾: "shrimp",
    可乐鸡翅: "wings",
    香酥鸡排: "cutlet",
    鲜虾蒸饺: "dumplings",
    小笼汤包: "buns",
    香菇青菜: "greens",
    麻婆豆腐: "tofu",
    酸辣土豆丝: "shreds",
    桂花糯米藕: "lotus",
    臭豆腐奶昔: "shake",
  };
  for (const [name, shape] of Object.entries(expected))
    assert.equal(
      DISH_VISUALS[name as keyof typeof DISH_VISUALS].shape,
      shape,
      name,
    );
  assert.match(render("牙膏夹心饼干", "bad"), /data-ingredient="toothpaste"/);
  assert.match(render("蒜泥草莓塔", "bad"), /data-ingredient="garlic"/);
});

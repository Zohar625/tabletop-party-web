import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

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

test("a closing lid never embeds hidden food or safety information", () => {
  const render = (kind: string, name: string) =>
    renderToStaticMarkup(
      createElement(DishArt, {
        covered: true,
        motion: "close",
        dish: { kind, name },
      }),
    );
  const safe = render("safe", "红烧肉");
  assert.equal(safe, render("bad", "芥末奶油蛋糕"));
  assert.match(safe, /lid-close/);
  assert.doesNotMatch(
    safe,
    /红烧肉|芥末奶油蛋糕|data-safety|data-dish-shape|data-ingredient/,
  );
});

test("a public reveal draws its food below the opening lid", () => {
  const result = renderToStaticMarkup(
    createElement(DishArt, {
      motion: "open",
      dish: { kind: "safe", name: "红烧肉" },
    }),
  );
  assert.match(result, /正常料理/);
  assert.match(result, /lid-open/);
  assert.ok(result.indexOf('data-safety="safe"') < result.indexOf("lid-open"));
});


test("an empty table plate starts open with no lid or hidden dish", () => {
  const result = renderToStaticMarkup(createElement(DishArt, { covered: true, empty: true }));
  assert.match(result, /等待上菜的空盘/);
  assert.doesNotMatch(result, /dish-lid|data-safety|data-dish-shape/);
});

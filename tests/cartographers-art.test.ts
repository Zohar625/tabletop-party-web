import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const source = await readFile(
  new URL("../src/games/cartographers/TerrainArt.tsx", import.meta.url),
  "utf8",
);
const output = ts
  .transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
  })
  .outputText.replaceAll(
    '"react/jsx-runtime"',
    JSON.stringify(import.meta.resolve("react/jsx-runtime")),
  );
const { TerrainArt, MapIllustration } = await import(
  `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
);
const render = (terrain: string | null, variant = 0) =>
  renderToStaticMarkup(createElement(TerrainArt, { terrain, variant }));

test("terrain art provides readable Chinese labels and different drawn silhouettes", () => {
  const terrains = [
    ["forest", "森林"],
    ["village", "村落"],
    ["farm", "农田"],
    ["water", "水域"],
    ["monster", "怪物"],
    ["mountain", "山峰"],
    ["wasteland", "荒地"],
  ];
  const silhouettes = new Set<string>();
  for (const [terrain, label] of terrains) {
    const markup = render(terrain);
    assert.match(markup, new RegExp(`aria-label="${label}"`));
    assert.match(markup, /viewBox="0 0 60 60"/);
    assert.match(markup, /<path/);
    assert.doesNotMatch(markup, /\p{Extended_Pictographic}/u);
    silhouettes.add(
      markup.replace(
        /aria-label="[^"]*"|<title>[^<]*<\/title>|data-terrain="[^"]*"/g,
        "",
      ),
    );
  }
  assert.equal(silhouettes.size, 7);
});

test("empty terrain stays transparent and decorative variants are deterministic", () => {
  assert.match(render(null), /aria-label="空地"/);
  assert.doesNotMatch(render(null), /<(path|rect|circle|ellipse|polygon)\b/);
  assert.equal(render("forest", 7), render("forest", 7));
  assert.notEqual(render("forest", 0), render("forest", 1));
});

test("hero map is a scalable accessible illustration with no external asset dependencies", () => {
  const markup = renderToStaticMarkup(createElement(MapIllustration));
  assert.match(markup, /role="img"/);
  assert.match(markup, /aria-label="[^"]*地图[^"]*"/);
  assert.match(markup, /viewBox="0 0 720 500"/);
  assert.doesNotMatch(markup, /<image|https?:|\p{Extended_Pictographic}/u);
  assert.ok((markup.match(/<path/g) ?? []).length > 40);
});

import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  ["", "一桌好戏-本地试玩.html", "./超级井字棋-本地试玩.html"],
  ["super-tic-tac-toe", "超级井字棋-本地试玩.html", "./一桌好戏-本地试玩.html"],
];
for (const [page, offline, link] of pages) {
  const folder = resolve(root, "dist", page);
  const web = await readFile(resolve(folder, "index.html"), "utf8");
  for (const [, asset] of web.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert(asset.startsWith("./"), `网页资源必须使用相对路径：${asset}`);
    await access(resolve(folder, asset));
  }
  const html = await readFile(resolve(root, offline), "utf8");
  assert(
    !/<script\b[^>]*src=|<link\b[^>]*rel="(?:stylesheet|modulepreload)"/.test(
      html,
    ),
    `${offline} 仍依赖外部脚本或样式`,
  );
  const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert(js, `${offline} 缺少应用脚本`);
  assert(js.includes(link), `${offline} 缺少游戏间跳转`);
  await access(resolve(root, link));
  const parsed = spawnSync(
    process.execPath,
    ["--input-type=module", "--check"],
    { input: js, encoding: "utf8" },
  );
  assert.equal(parsed.status, 0, parsed.stderr);
}
console.log("两个网页入口资源、本地试玩脚本语法及互相跳转检查通过。");
const dinnerFolder = resolve(root, "dist/dinner");
const dinner = await readFile(resolve(dinnerFolder, "index.html"), "utf8");
for (const [, asset] of dinner.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert(asset.startsWith("./"));
  await access(resolve(dinnerFolder, asset));
}
const lobby = await readFile(resolve(root, "一桌好戏-本地试玩.html"), "utf8");
assert(
  lobby.includes(
    "https://zohar625.github.io/tabletop-party-web/dinner/index.html",
  ),
);
console.log("联机入口资源及本地大厅的在线链接检查通过。");

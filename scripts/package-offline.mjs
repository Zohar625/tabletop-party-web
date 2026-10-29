import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function bundle(page, output, links) {
  const dist = resolve(root, "dist", page);
  let html = await readFile(resolve(dist, "index.html"), "utf8");
  const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
  const style = html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
  if (!script || !style)
    throw Error("无法识别构建入口；请先运行 npm run build");
  let js = await readFile(resolve(dist, script[1].replace(/^\//, "")), "utf8");
  const css = await readFile(
    resolve(dist, style[1].replace(/^\//, "")),
    "utf8",
  );
  if (/<link\b[^>]*rel="modulepreload"/.test(html)) {
    throw Error("本地试玩入口不能依赖共享脚本");
  }
  for (const [web, local] of Object.entries(links)) {
    if (!js.includes(web)) throw Error(`缺少游戏导航：${web}`);
    js = js.replaceAll(web, local);
  }
  // Keep source text literal in replacement (String.replace treats $& specially).
  html = html.replace(
    script[0],
    () =>
      `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
  html = html.replace(style[0], () => `<style>${css}</style>`);
  await writeFile(resolve(root, output), html, "utf8");
  console.log(`本地试玩已生成：${output}`);
}

await bundle("", "一桌好戏-本地试玩.html", {
  "./super-tic-tac-toe/index.html": "./超级井字棋-本地试玩.html",
  "./cartographers/index.html":
    "https://zohar625.github.io/tabletop-party-web/cartographers/index.html",
  "./dinner/index.html":
    "https://zohar625.github.io/tabletop-party-web/dinner/index.html",
  "./scout/index.html":
    "https://zohar625.github.io/tabletop-party-web/scout/index.html",
  "./bluff-classic/index.html":
    "https://zohar625.github.io/tabletop-party-web/bluff-classic/index.html",
});
await bundle("super-tic-tac-toe", "超级井字棋-本地试玩.html", {
  "../index.html": "./一桌好戏-本地试玩.html",
});

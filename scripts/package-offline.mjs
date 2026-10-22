import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
let html = await readFile(resolve(dist, "index.html"), "utf8");
const script = html.match(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/);
const style = html.match(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/);
if (!script || !style) throw Error("无法识别构建入口；请先运行 npm run build");
const js = await readFile(resolve(dist, script[1].replace(/^\//, "")), "utf8");
const css = await readFile(resolve(dist, style[1].replace(/^\//, "")), "utf8");
// Keep source text literal in replacement (String.replace treats $& specially).
html = html.replace(
  script[0],
  () =>
    `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`,
);
html = html.replace(style[0], () => `<style>${css}</style>`);
const output = resolve(root, "一桌好戏-本地试玩.html");
await writeFile(output, html, "utf8");
console.log(`本地单文件已生成：${output}`);

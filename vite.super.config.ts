import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./super-tic-tac-toe", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/super-tic-tac-toe", import.meta.url)),
    emptyOutDir: true,
  },
});

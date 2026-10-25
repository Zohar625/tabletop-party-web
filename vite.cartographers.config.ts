import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./cartographers", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/cartographers", import.meta.url)),
    emptyOutDir: true,
  },
});

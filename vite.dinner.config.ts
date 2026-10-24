import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./dinner", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/dinner", import.meta.url)),
    emptyOutDir: true,
  },
});

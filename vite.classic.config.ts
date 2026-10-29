import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("./bluff-classic", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/bluff-classic", import.meta.url)),
    emptyOutDir: true,
  },
});

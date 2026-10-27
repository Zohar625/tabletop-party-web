import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./scout", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./dist/scout", import.meta.url)),
    emptyOutDir: true,
  },
});

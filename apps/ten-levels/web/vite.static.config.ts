import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Patch 0009: the static demo build (GitHub Pages). No API, no dev proxy: run with VITE_STATIC=1; data comes from
// public/data/*.json (written by the workbench publish script). Base: VITE_BASE, default /jev-trading-lab/.
export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_BASE || "/jev-trading-lab/",
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});

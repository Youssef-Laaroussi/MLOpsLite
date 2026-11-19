/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execFileSync } from "node:child_process";
import { version } from "./package.json";

let commit: string | null = null;
try { commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: path.resolve(__dirname, "../.."), stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { /* Source archives may not include Git metadata. */ }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __MLITE_BUILD__: JSON.stringify({ version, date: new Date().toISOString(), commit }) },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      clientPort: 3000,
    },
    proxy: {
      "/api": {
        target: process.env.MLITE_API_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});

import { defineConfig } from "vite";
import path from "path";

// https://vitejs.dev/config
export default defineConfig({
  // main / renderer と揃えておく。preload配下は現状すべて相対importだが、
  // `@/` を使った時点でビルドが落ちるのを避ける。
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages でのレビュー環境ホスティング用。
// プロジェクトページ (https://<user>.github.io/asset-sim/) では
// サブパスにデプロイされるため、ビルド時のみ base を合わせる。
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/asset-sim/" : "/",
  server: {
    host: true,
    port: 5173,
  },
}));

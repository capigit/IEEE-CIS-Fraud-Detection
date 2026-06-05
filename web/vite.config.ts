import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["echarts"],
          react: ["react", "react-dom"]
        }
      }
    }
  },
  server: {
    port: 5173
  }
});

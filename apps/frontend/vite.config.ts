import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@mui/styled-engine": "@mui/styled-engine-sc",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [],
  },
});

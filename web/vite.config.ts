import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // wrangler dev serves the Worker (and D1) on 8787
      "/api": "http://localhost:8787",
    },
  },
});

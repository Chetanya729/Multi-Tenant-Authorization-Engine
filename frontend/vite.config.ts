import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  // Shell variables win over .env files, so `VITE_API_TARGET=http://localhost:9090 npm run dev` works.
  const env = { ...loadEnv(mode, root, ""), ...process.env };
  const proxy = {
    "/api": {
      target: env.VITE_API_TARGET || "http://localhost:8080",
      changeOrigin: true,
    },
  };
  return {
    root,
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});

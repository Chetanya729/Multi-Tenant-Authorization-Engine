import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * Writes dist/_headers for Cloudflare Pages: security headers for every page and long caching for hashed assets.
 * The Content-Security-Policy's connect-src is built from VITE_API_BASE_URL, so the API the app calls and the
 * API the browser allows can never drift apart.
 */
function cloudflareHeaders(apiBaseUrl: string): Plugin {
  let apiOrigin = "";
  if (apiBaseUrl) {
    const url = new URL(apiBaseUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      throw new Error(`VITE_API_BASE_URL must use https: ${apiBaseUrl}`);
    }
    apiOrigin = url.origin;
  }
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const headers = `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=31536000

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

  return {
    name: "cloudflare-headers",
    apply: "build",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "_headers", source: headers });
    },
  };
}

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
    plugins: [react(), tailwindcss(), cloudflareHeaders(env.VITE_API_BASE_URL ?? "")],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});

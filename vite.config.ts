import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const desde = (ruta: string) => fileURLToPath(new URL(ruta, import.meta.url));

/** El contrato y el cliente HTTP se compilan desde su código fuente en packages/. */
export const ALIAS = {
  "@markenny/contrato/dominio": desde("./packages/contrato/src/dominio.js"),
  "@markenny/contrato": desde("./packages/contrato/src/index.js"),
  "@markenny/cliente-http": desde("./packages/cliente-http/src/index.ts"),
  "@": desde("./src"),
};

/**
 * El navegador llama a /api en el mismo origen y Vite lo reenvía al backend.
 * Así la cookie de sesión funciona sin CORS. Destino configurable con
 * VITE_BACKEND_URL (por defecto http://localhost:3000).
 */
const PROXY_API = {
  "/api": { target: process.env.VITE_BACKEND_URL ?? "http://localhost:3000", changeOrigin: false },
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: ALIAS,
    // Una sola copia de Zod aunque los paquetes tengan su propio node_modules.
    dedupe: ["zod"],
  },
  server: {
    port: 5173,
    host: true,
    proxy: PROXY_API,
  },
  preview: {
    port: 4173,
    proxy: PROXY_API,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          forms: ["react-hook-form", "zod", "@hookform/resolvers"],
          radix: [
            "@radix-ui/react-collapsible",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-label",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slot",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
        },
      },
    },
  },
});

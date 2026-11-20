import { defineConfig } from "vitest/config";
import { ALIAS } from "./vite.config";

// Zona horaria de Markenny (UTC-4): las pruebas de fechas reproducen el
// desfase de un día que se corrigió. Se fija aquí y no en el script de npm
// porque `TZ=... vitest` no funciona en PowerShell.
process.env.TZ = "America/Caracas";

export default defineConfig({
  resolve: { alias: ALIAS, dedupe: ["zod"] },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});

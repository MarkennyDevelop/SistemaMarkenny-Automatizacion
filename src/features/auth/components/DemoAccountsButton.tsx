import { useState } from "react";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authApi } from "../api/authApi";

const CUENTAS = [
  "Administrador · admin@markenny.com / Markenny2026",
  "Vendedor · valeria@markenny.com / Ventas2026",
  "Producción · luis@markenny.com / Planta2026",
];

/**
 * Atajo de desarrollo para instalar las cuentas de demostración en el navegador
 * que abre la persona que evalúa la interfaz. No existe en el build de producción.
 */
export function DemoAccountsButton() {
  const [cargando, setCargando] = useState(false);

  if (!import.meta.env.DEV) return null;

  async function cargar() {
    const confirmado = window.confirm(
      "Se reemplazarán las cuentas guardadas en este navegador por las tres cuentas demo y se cerrará la sesión actual. ¿Continuar?",
    );
    if (!confirmado) return;

    setCargando(true);
    try {
      await authApi.cargarCuentasDemo();
      toast.success("Cuentas demo instaladas", {
        description: "Recargando para aplicar los cambios...",
      });
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      toast.error("No se pudieron instalar las cuentas demo", {
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
      setCargando(false);
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3.5">
      <div className="flex items-start gap-2.5">
        <DatabaseBackup className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[12px] font-semibold uppercase tracking-wide">
            Acceso demo · solo desarrollo
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Si las credenciales no funcionan, instala aquí las tres cuentas de
            prueba en este navegador.
          </p>
          <ul className="mt-2 space-y-0.5 text-[10px] leading-relaxed text-muted-foreground/80">
            {CUENTAS.map((cuenta) => (
              <li key={cuenta}>{cuenta}</li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={cargar}
            disabled={cargando}
          >
            {cargando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <DatabaseBackup className="h-3.5 w-3.5" />
            )}
            Cargar cuentas demo
          </Button>
        </div>
      </div>
    </div>
  );
}

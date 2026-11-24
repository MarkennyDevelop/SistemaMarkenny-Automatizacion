import { useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { mensajeDeError } from "@/shared/api/cliente";
import { ROL_LABEL, type OrdenTrabajo } from "@/shared/domain";
import { useAgregarNota } from "../hooks/useOrdenesTrabajo";

function fechaHora(fecha: string) {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fecha));
}

/**
 * Observaciones de la orden. El vendedor no mueve fases: deja una nota o
 * solicita revisión y Producción/Administración deciden el retrabajo.
 */
export function NotasOrdenCard({ orden }: { orden: OrdenTrabajo }) {
  const [mensaje, setMensaje] = useState("");
  const [solicitaRetrabajo, setSolicitaRetrabajo] = useState(false);
  const agregar = useAgregarNota();
  const notas = orden.notas ?? [];
  const valido = mensaje.trim().length >= 3;
  // Pedir revisión solo tiene sentido mientras la orden no está empaquetada.
  const puedeSolicitar = orden.fase === "EN_REVISION" || orden.fase === "FINALIZADO";

  const enviar = async () => {
    if (!valido) return;
    try {
      await agregar.mutateAsync({
        ordenId: orden.id,
        mensaje: mensaje.trim(),
        solicitaRetrabajo: puedeSolicitar && solicitaRetrabajo,
      });
      toast.success(solicitaRetrabajo && puedeSolicitar ? "Revisión solicitada" : "Observación registrada", {
        description: "Producción y Administración reciben el aviso.",
      });
      setMensaje("");
      setSolicitaRetrabajo(false);
    } catch (error) {
      toast.error("No se pudo registrar la observación", { description: mensajeDeError(error) });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="section-label">Observaciones</p>
        <Badge variant="muted">{notas.length}</Badge>
      </div>

      {notas.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {notas.map((nota) => (
            <li key={nota.id} className="rounded-md bg-muted/60 px-2.5 py-2 text-[11px] leading-snug">
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">{nota.usuario}</span> · {ROL_LABEL[nota.rol]} ·{" "}
                {fechaHora(nota.fecha)}
                {nota.solicitaRetrabajo && <span className="ml-1.5 font-semibold text-primary">Pide revisión</span>}
              </p>
              <p className="mt-0.5">{nota.mensaje}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2">
        <label htmlFor="nota-vendedor" className="sr-only">
          Nueva observación
        </label>
        <Textarea
          id="nota-vendedor"
          rows={2}
          maxLength={500}
          value={mensaje}
          onChange={(event) => setMensaje(event.target.value)}
          placeholder="Observación para el taller (ej. el cliente pidió cambiar el color de tinta)..."
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className={cn("flex items-center gap-2 text-[11px]", !puedeSolicitar && "opacity-50")}>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-primary"
              checked={puedeSolicitar && solicitaRetrabajo}
              disabled={!puedeSolicitar}
              onChange={(event) => setSolicitaRetrabajo(event.target.checked)}
            />
            Solicitar revisión (retrabajo)
          </label>
          <Button size="sm" onClick={enviar} disabled={!valido || agregar.isPending}>
            {agregar.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-3.5 w-3.5" />
            )}
            Registrar
          </Button>
        </div>
      </div>
    </Card>
  );
}

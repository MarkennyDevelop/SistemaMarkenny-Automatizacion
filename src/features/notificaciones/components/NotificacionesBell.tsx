import { Bell, CheckCheck, PackageCheck, Radio, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Notificacion } from "@/shared/domain";
import {
  useMarcarNotificacionLeida,
  useMarcarTodasLeidas,
  useNotificaciones,
} from "../hooks/useNotificaciones";

function hace(fecha: string) {
  const segundos = Math.max(
    0,
    Math.round((Date.now() - new Date(fecha).getTime()) / 1000),
  );
  if (segundos < 60) return "ahora";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `${horas} h`;
  return `${Math.round(horas / 24)} d`;
}

const ICONO: Record<Notificacion["tipo"], typeof Bell> = {
  PEDIDO_LISTO: PackageCheck,
  FASE: Radio,
  STOCK: TriangleAlert,
  SISTEMA: Radio,
};

export function NotificacionesBell() {
  const navigate = useNavigate();
  const { notificaciones, sinLeer } = useNotificaciones();
  const marcarLeida = useMarcarNotificacionLeida();
  const marcarTodas = useMarcarTodasLeidas();

  const abrir = (notificacion: Notificacion) => {
    marcarLeida.mutate(notificacion.id);
    if (notificacion.codigo) {
      navigate(`/ventas/seguimiento?ot=${notificacion.codigo}`);
    } else if (notificacion.tipo === "STOCK") {
      navigate("/inventario");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notificaciones (${sinLeer} sin leer)`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {sinLeer > 0 && (
            <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
              {sinLeer}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[330px] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-[11px] uppercase tracking-widest text-muted-foreground">
            Notificaciones
          </DropdownMenuLabel>
          {sinLeer > 0 && (
            <button
              type="button"
              onClick={() => marcarTodas.mutate()}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3 w-3" />
              Marcar leídas
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto p-1">
          {notificaciones.length === 0 ? (
            <p className="px-3 py-8 text-center text-[11px] text-muted-foreground">
              Sin notificaciones por ahora.
            </p>
          ) : (
            notificaciones.slice(0, 10).map((notificacion) => {
              const leida = notificacion.leida;
              const Icono = ICONO[notificacion.tipo];
              return (
                <DropdownMenuItem
                  key={notificacion.id}
                  className={cn(
                    "items-start gap-2.5 py-2.5",
                    leida && "opacity-55",
                  )}
                  onSelect={() => abrir(notificacion)}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-sm",
                      notificacion.tipo === "PEDIDO_LISTO"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icono className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-snug">
                      {notificacion.titulo}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {notificacion.detalle}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground">
                    {hace(notificacion.creadaEn)}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <div className="px-3 py-2 text-center text-[10px] text-muted-foreground">
          Centro de notificaciones · ventas y producción
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

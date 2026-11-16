import { useState } from "react";
import { Bell, CheckCheck, Menu, Radio } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
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

const SECTION_LABELS: { path: string; label: string }[] = [
  { path: "/ventas/nueva-orden", label: "Nueva orden" },
  { path: "/ventas/ordenes", label: "Órdenes de trabajo" },
  { path: "/ventas/cotizador", label: "Cotizador" },
  { path: "/ventas/clientes", label: "Clientes" },
  { path: "/planta", label: "Planta Kanban" },
  { path: "/inventario", label: "Inventario" },
  { path: "/", label: "Dashboard" },
];

const NOTIFICACIONES = [
  {
    id: "n1",
    titulo: "Pantone 032 C bajo mínimo",
    detalle: "Quedan 1,5 kg · mínimo 2 kg",
    hace: "12 min",
    critica: true,
  },
  {
    id: "n2",
    titulo: "OT-2026-0182 pasó a revisión",
    detalle: "Etiquetas Fundy · Carlos Mendoza",
    hace: "34 min",
    critica: false,
  },
  {
    id: "n3",
    titulo: "Entrega de OT-2026-0174 vence hoy",
    detalle: "Calcomanías El Pelón · empaquetado",
    hace: "1 h",
    critica: true,
  },
];

interface TopbarProps {
  onOpenMenu: () => void;
}

export function Topbar({ onOpenMenu }: TopbarProps) {
  const location = useLocation();
  const [leidas, setLeidas] = useState<string[]>([]);

  const seccion =
    SECTION_LABELS.find(
      (item) => item.path === location.pathname || location.pathname.startsWith(`${item.path}/`),
    )?.label ?? "Sistema";

  const sinLeer = NOTIFICACIONES.filter((item) => !leidas.includes(item.id)).length;
  const fecha = new Intl.DateTimeFormat("es-VE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-1 lg:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 items-center gap-2 text-xs">
        <span className="hidden font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
          Markenny
        </span>
        <span className="hidden text-border sm:inline">/</span>
        <span className="truncate font-medium text-foreground">{seccion}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:inline-flex">
          <Radio className="h-3 w-3 text-primary" />
          Planta en vivo
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-primary" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        </span>

        <span className="hidden px-1 text-[11px] text-muted-foreground lg:inline">
          {fecha}
        </span>

        <ThemeToggle />

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
          <DropdownMenuContent align="end" className="w-[320px] p-0">
            <div className="flex items-center justify-between border-b px-3 py-2.5">
              <DropdownMenuLabel className="p-0 text-[11px] uppercase tracking-widest text-muted-foreground">
                Notificaciones
              </DropdownMenuLabel>
              <button
                type="button"
                onClick={() => setLeidas(NOTIFICACIONES.map((item) => item.id))}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                Marcar leídas
              </button>
            </div>
            <div className="p-1">
              {NOTIFICACIONES.map((item) => {
                const leida = leidas.includes(item.id);
                return (
                  <DropdownMenuItem
                    key={item.id}
                    className={cn(
                      "items-start gap-2.5 py-2.5",
                      leida && "opacity-50",
                    )}
                    onSelect={() =>
                      setLeidas((current) =>
                        current.includes(item.id) ? current : [...current, item.id],
                      )
                    }
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        item.critica ? "bg-primary" : "bg-muted-foreground/50",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug">
                        {item.titulo}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.detalle}
                      </p>
                    </div>
                    <span className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {item.hace}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </div>
            <DropdownMenuSeparator className="m-0" />
            <div className="px-3 py-2 text-center text-[10px] text-muted-foreground">
              Centro de notificaciones de producción
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-1 flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-markenny-ink text-[11px] font-bold text-white dark:bg-white dark:text-markenny-ink">
            KH
          </div>
          <div className="hidden leading-tight xl:block">
            <p className="text-[11px] font-semibold">Kenny Hernández</p>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Administrador
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

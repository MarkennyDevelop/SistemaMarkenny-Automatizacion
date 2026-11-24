import { FileStack, FileText, Layers3, type LucideIcon } from "lucide-react";
import { NavLink, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth";

type TipoTrabajo = "papeleria" | "gran-formato" | "general";

const TABS: {
  id: TipoTrabajo;
  to: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    id: "papeleria",
    to: "/ventas/nueva-orden",
    label: "Papelería corporativa",
    hint: "Facturas · talonarios · récipes · tarjetas",
    icon: FileText,
  },
  {
    id: "gran-formato",
    to: "/ventas/nueva-orden/pendones",
    label: "Pendones y stickers",
    hint: "Lona · vinil · adhesivos",
    icon: Layers3,
  },
  {
    id: "general",
    to: "/ventas/nueva-orden/otros",
    label: "Trabajo general",
    hint: "Ficha libre de producción",
    icon: FileStack,
  },
];

interface TipoTrabajoTabsProps {
  activo: TipoTrabajo;
}

/**
 * Selector del tipo de ficha técnica. Cada pestaña es un flujo y un
 * Compound Component distintos; el trabajo general queda solo para Admin.
 */
export function TipoTrabajoTabs({ activo }: TipoTrabajoTabsProps) {
  const { usuario } = useAuth();
  const [searchParams] = useSearchParams();
  // Al cambiar de ficha se conserva el cliente elegido desde Clientes.
  const cliente = searchParams.get("cliente");
  const sufijo = cliente ? `?cliente=${encodeURIComponent(cliente)}` : "";
  const tabs = TABS.filter(
    (tab) => tab.id !== "general" || usuario?.rol === "ADMIN",
  );

  return (
    <nav
      aria-label="Tipo de trabajo"
      className="grid gap-2 sm:grid-cols-3"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.id}
          to={`${tab.to}${sufijo}`}
          end={tab.id === "papeleria"}
          aria-current={activo === tab.id ? "page" : undefined}
          className={cn(
            "group flex items-start gap-3 rounded-lg border px-3.5 py-3 transition-all",
            activo === tab.id
              ? "border-markenny-ink bg-markenny-ink text-white shadow-raised dark:border-white dark:bg-white dark:text-markenny-ink"
              : "border-border bg-card text-foreground hover:border-foreground/25",
          )}
        >
          <span
            className={cn(
              "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border",
              activo === tab.id
                ? "border-white/20 bg-white/10 text-primary dark:border-markenny-ink/15 dark:bg-markenny-ink/10"
                : "border-border bg-muted/60 text-muted-foreground",
            )}
          >
            <tab.icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold leading-tight">
              {tab.label}
            </span>
            <span
              className={cn(
                "mt-1 block text-[10px] uppercase tracking-wide",
                activo === tab.id ? "text-white/55 dark:text-markenny-ink/60" : "text-muted-foreground",
              )}
            >
              {tab.hint}
            </span>
          </span>
        </NavLink>
      ))}
    </nav>
  );
}

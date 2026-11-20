import type { FasePlanta } from "@/shared/domain";

type BadgeVariant =
  | "default"
  | "solid"
  | "secondary"
  | "outline"
  | "muted"
  | "destructive";

interface FaseUI {
  label: string;
  badge: BadgeVariant;
  dot: string;
  accent: string;
  soft: string;
}

/**
 * Tratamiento visual de fases dentro de la paleta corporativa
 * (rojo / negro / blanco + neutros). Nada de colores ajenos a la marca.
 */
export const FASE_UI: Record<FasePlanta, FaseUI> = {
  EN_PROCESO: {
    label: "En Proceso",
    badge: "default",
    dot: "bg-primary",
    accent: "text-primary",
    soft: "bg-primary/[0.06]",
  },
  EN_REVISION: {
    label: "En Revisión",
    badge: "solid",
    dot: "bg-primary",
    accent: "text-primary",
    soft: "bg-primary/[0.08]",
  },
  FINALIZADO: {
    label: "Finalizado",
    badge: "secondary",
    dot: "bg-markenny-ink dark:bg-white",
    accent: "text-foreground",
    soft: "bg-foreground/[0.05]",
  },
  EMPAQUETADO: {
    label: "Empaquetado",
    badge: "outline",
    dot: "bg-muted-foreground",
    accent: "text-muted-foreground",
    soft: "bg-muted/60",
  },
};

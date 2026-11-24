import * as React from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  index: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Sección plegable de un formulario compuesto.
 * Comparte la estética de "ficha técnica" de Markenny sin acoplarse
 * a un dominio específico (se reutiliza en OT y Cotizador).
 */
export function FormSection({
  index,
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = true,
  className,
}: FormSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card shadow-card",
          className,
        )}
      >
        <CollapsibleTrigger className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-muted/60 font-display text-sm font-semibold text-markenny-ink dark:text-foreground">
            {index}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-primary" />}
              <span className="font-display text-base font-semibold uppercase tracking-wide">
                {title}
              </span>
            </span>
            {description && (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/70 px-5 py-5">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium leading-none text-foreground"
        >
          {label}
          {required && <span className="ml-1 text-primary">*</span>}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-[11px] font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface ToggleCardProps {
  selected: boolean;
  onToggle: () => void;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  swatch?: string;
  icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
}

export function ToggleCard({
  selected,
  onToggle,
  title,
  description,
  meta,
  swatch,
  icon: Icon,
  className,
  disabled,
}: ToggleCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
        // Estado activo inequívoco: borde rojo Markenny, fondo tenue y check.
        selected
          ? "border-primary bg-primary/[0.06] ring-1 ring-primary"
          : "border-border bg-background hover:border-foreground/20 hover:bg-muted/40",
        className,
      )}
    >
      {swatch ? (
        <span
          className="mt-0.5 h-7 w-7 shrink-0 rounded-md border border-black/10 shadow-inner"
          style={{ backgroundColor: swatch }}
          aria-hidden="true"
        />
      ) : Icon ? (
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-md border",
            selected
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-muted/60 text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium">{title}</span>
          <span
            aria-hidden="true"
            className={cn(
              "ml-auto grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40",
            )}
          >
            {selected && <Check className="h-2.5 w-2.5" />}
          </span>
        </span>
        {description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {description}
          </span>
        )}
        {meta && (
          <span className="mt-1 block text-[11px] font-medium text-foreground/70">
            {meta}
          </span>
        )}
      </span>
    </button>
  );
}

export function FormGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
  );
}

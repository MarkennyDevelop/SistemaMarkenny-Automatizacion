import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Opcion<T extends string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
}

interface OptionGroupBaseProps<T extends string> {
  label: string;
  opciones: readonly Opcion<T>[];
  error?: string;
  className?: string;
  columnas?: string;
}

interface UnicaProps<T extends string> extends OptionGroupBaseProps<T> {
  multiple?: false;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  /** Permite desmarcar la opción elegida (campos opcionales del formato). */
  vaciable?: boolean;
}

interface MultipleProps<T extends string> extends OptionGroupBaseProps<T> {
  multiple: true;
  value: readonly T[];
  onChange: (value: T[]) => void;
}

/**
 * Casillas del formato físico (radio o casilla de verificación) como botones
 * accesibles. El estado lo controla el formulario: nada viene marcado de
 * antemano y cada clic se refleja al instante.
 */
export function OptionGroup<T extends string>(props: UnicaProps<T> | MultipleProps<T>) {
  const { label, opciones, error, className, columnas = "grid-cols-2 sm:grid-cols-4" } = props;

  const marcado = (valor: T) =>
    props.multiple ? props.value.includes(valor) : props.value === valor;

  const alternar = (valor: T) => {
    if (props.multiple) {
      props.onChange(
        props.value.includes(valor)
          ? props.value.filter((item) => item !== valor)
          : [...props.value, valor],
      );
    } else if (props.value === valor) {
      if (props.vaciable) props.onChange(undefined);
    } else {
      props.onChange(valor);
    }
  };

  return (
    <fieldset className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <legend className="section-label">{label}</legend>
        {error && <span className="text-[11px] text-destructive">{error}</span>}
      </div>
      <div
        role={props.multiple ? "group" : "radiogroup"}
        aria-label={label}
        className={cn("grid gap-2", columnas)}
      >
        {opciones.map((opcion) => {
          const activo = marcado(opcion.value);
          return (
            <button
              key={opcion.value}
              type="button"
              role={props.multiple ? "checkbox" : "radio"}
              aria-checked={activo}
              disabled={opcion.disabled}
              onClick={() => alternar(opcion.value)}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-45",
                activo
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background hover:border-foreground/25",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center border",
                  props.multiple ? "rounded-sm" : "rounded-full",
                  activo ? "border-primary-foreground" : "border-muted-foreground/50",
                )}
              >
                {activo && <Check className="h-2.5 w-2.5" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold leading-tight">{opcion.label}</span>
                {opcion.hint && (
                  <span
                    className={cn(
                      "mt-0.5 block text-[10px]",
                      activo ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {opcion.hint}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

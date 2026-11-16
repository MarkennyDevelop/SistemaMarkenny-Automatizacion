import { cn } from "@/lib/utils";

type LogoVariant = "light" | "dark" | "mark";
type LogoSize = "sm" | "md" | "lg";

interface MarkennyLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  withTagline?: boolean;
  className?: string;
}

const markSizes: Record<LogoSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const wordSizes: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

const taglineSizes: Record<LogoSize, string> = {
  sm: "text-[8px]",
  md: "text-[9px]",
  lg: "text-[10px]",
};

/**
 * Marca gráfica de Markenny C.A.
 * Reinterpretación vectorial del isotipo (K angular + flecha roja) y el logotipo.
 * No depende de imágenes externas: se adapta a fondos claros/oscuros.
 */
export function MarkennyLogo({
  variant = "light",
  size = "md",
  withTagline = true,
  className,
}: MarkennyLogoProps) {
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative grid shrink-0 place-items-center rounded-lg",
          markSizes[size],
          isLight ? "bg-white/[0.04] ring-1 ring-white/10" : "bg-markenny-ink",
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 48" className="h-[78%] w-[78%]" role="img">
          <title>Markenny</title>
          <path
            d="M6 8h5.4v32H6z"
            fill={isLight ? "#FFFFFF" : "#FFFFFF"}
          />
          <path
            d="M15.5 10.5 33 24 15.5 37.5v-8.2L24.6 24l-9.1-5.3z"
            fill={isLight ? "#FFFFFF" : "#FFFFFF"}
            opacity={isLight ? 0.92 : 1}
          />
          <path
            d="M23.5 20.8h10.9V14l7.6 10-7.6 10v-6.8H23.5z"
            fill="#C9182B"
          />
        </svg>
      </div>

      {variant !== "mark" && (
        <div className="min-w-0 leading-none">
          <p
            className={cn(
              "font-display font-bold uppercase tracking-[0.16em]",
              wordSizes[size],
              isLight ? "text-white" : "text-markenny-ink",
            )}
          >
            Markenny
          </p>
          {withTagline && (
            <p
              className={cn(
                "mt-1.5 font-sans font-medium uppercase tracking-[0.3em]",
                taglineSizes[size],
                isLight ? "text-white/40" : "text-markenny-steel",
              )}
            >
              Print MIS · C.A.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

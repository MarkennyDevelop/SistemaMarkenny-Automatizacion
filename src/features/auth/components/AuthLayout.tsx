import type { ReactNode } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { MarkennyLogo } from "@/components/brand/MarkennyLogo";
import { FASES_PLANTA } from "@/shared/domain";
import { SISTEMA } from "@/shared/catalogos";
import { DemoAccountsButton } from "./DemoAccountsButton";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  volverA?: string;
}

/**
 * Marco visual de las pantallas públicas (login y alta del administrador).
 * Panel negro con la marca a la izquierda y formulario blanco a la derecha.
 */
export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
  volverA,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-markenny-ink px-10 py-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-markenny-sweep" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full border border-white/5" />
        <div className="pointer-events-none absolute -right-10 top-1/3 h-[260px] w-[260px] rounded-full border border-primary/20" />

        <MarkennyLogo variant="light" size="md" />

        <div className="relative mt-16 max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">
            Print MIS · Edición imprenta
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold uppercase leading-[0.95] tracking-wide">
            Del pedido
            <br />
            al despacho,
            <br />
            <span className="text-primary">sin perder una hoja.</span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/55">
            Ventas, taller y almacén comparten una sola ficha técnica. Cada orden
            recorre cuatro fases auditables antes de llegar al cliente.
          </p>
        </div>

        <div className="relative mt-auto max-w-md space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">
            Flujo obligatorio de calidad
          </p>
          <ol className="grid grid-cols-2 gap-2">
            {FASES_PLANTA.map((fase, index) => (
              <li
                key={fase}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <span className="grid h-6 w-6 place-items-center rounded-sm bg-white/[0.06] font-display text-[11px] font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-white/75">
                  {fase === "EN_PROCESO" && "En proceso"}
                  {fase === "EN_REVISION" && "En revisión"}
                  {fase === "FINALIZADO" && "Finalizado"}
                  {fase === "EMPAQUETADO" && "Empaquetado"}
                </span>
              </li>
            ))}
          </ol>

          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[10px] uppercase tracking-[0.18em] text-white/35">
            <span>{SISTEMA.empresa}</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-primary" />
              Acceso por rol
            </span>
          </div>
        </div>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between lg:hidden">
          <MarkennyLogo variant="dark" size="sm" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Print MIS
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-8">
          {volverA && (
            <Link
              to={volverA}
              className="mb-6 inline-flex w-fit items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Link>
          )}

          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold uppercase leading-none tracking-wide">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div className="mt-7">{children}</div>

          <DemoAccountsButton />

          {footer && (
            <div className="mt-6 border-t border-border/70 pt-5 text-[12px] text-muted-foreground">
              {footer}
            </div>
          )}
        </div>

        <p className="mx-auto w-full max-w-[430px] text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
          {SISTEMA.version} · Rojo · Negro · Blanco
        </p>
      </main>
    </div>
  );
}

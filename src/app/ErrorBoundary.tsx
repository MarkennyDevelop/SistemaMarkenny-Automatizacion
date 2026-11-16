import * as React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Error inesperado",
    };
  }

  componentDidCatch(error: unknown) {
    // Punto de integración futuro con Sentry / telemetría de planta.
    console.error("[Markenny Print MIS]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-markenny-paper p-6">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-card">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-md bg-primary font-display text-lg font-bold text-white">
              M
            </div>
            <h1 className="mt-4 font-display text-xl font-semibold uppercase tracking-wide">
              Algo se detuvo en planta
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {this.state.message ?? "Se produjo un error inesperado en la interfaz."}
            </p>
            <Button
              className="mt-5 w-full"
              onClick={() => window.location.reload()}
            >
              Recargar el sistema
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

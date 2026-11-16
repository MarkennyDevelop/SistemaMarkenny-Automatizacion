import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { MarkennyLogo } from "@/components/brand/MarkennyLogo";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md text-center">
        <MarkennyLogo variant="mark" size="lg" className="justify-center" />
        <p className="mt-5 font-display text-6xl font-semibold leading-none text-primary">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La ruta solicitada no existe en el Print MIS. Verifica el enlace o vuelve al
          tablero de producción.
        </p>
        <Button asChild className="mt-5">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Volver al dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}

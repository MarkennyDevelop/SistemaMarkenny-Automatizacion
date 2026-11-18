import { useState } from "react";
import type { FasePlanta, OrdenTrabajo } from "@/shared/domain";
import { KanbanColumn } from "./KanbanColumn";

export interface ColumnaKanban {
  fase: FasePlanta;
  ordenes: OrdenTrabajo[];
}

interface KanbanBoardProps {
  columnas: ColumnaKanban[];
  isLoading?: boolean;
  movingId?: string | null;
  onMoveOrden: (ordenId: string, fase: FasePlanta) => void;
  onOpenOrden?: (orden: OrdenTrabajo) => void;
}

/**
 * Presentational puro del tablero. No conoce TanStack Query ni el estado
 * de conexión: recibe columnas y emite movimientos al contenedor.
 */
export function KanbanBoard({
  columnas,
  isLoading,
  movingId,
  onMoveOrden,
  onOpenOrden,
}: KanbanBoardProps) {
  const [, setArrastrando] = useState<string | null>(null);

  return (
    <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 xl:mx-0 xl:grid xl:grid-cols-4 xl:overflow-visible xl:px-0">
      {columnas.map((columna, index) => (
        <KanbanColumn
          key={columna.fase}
          fase={columna.fase}
          indice={index}
          ordenes={columna.ordenes}
          isLoading={isLoading}
          movingId={movingId}
          onMoveOrden={onMoveOrden}
          onOpenOrden={onOpenOrden}
          onDragStart={setArrastrando}
          onDragEnd={() => setArrastrando(null)}
        />
      ))}
    </div>
  );
}

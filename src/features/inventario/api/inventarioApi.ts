import type {
  MaterialInventario,
  MovimientoInventario,
  TipoMovimiento,
} from "@/shared/domain";
import { mockDb } from "@/shared/mock/db";

export interface RegistrarMovimientoInput {
  materialId: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  usuario: string;
}

/**
 * Adaptador de datos de Inventario.
 * Endpoints previstos:
 *   GET  /v1/inventario
 *   GET  /v1/inventario/movimientos
 *   POST /v1/inventario/movimientos
 */
export const inventarioApi = {
  listar: (): Promise<MaterialInventario[]> => mockDb.listarInventario(),
  listarMovimientos: (): Promise<MovimientoInventario[]> =>
    mockDb.listarMovimientos(),
  registrarMovimiento: (
    input: RegistrarMovimientoInput,
  ): Promise<MovimientoInventario> => mockDb.registrarMovimiento(input),
};

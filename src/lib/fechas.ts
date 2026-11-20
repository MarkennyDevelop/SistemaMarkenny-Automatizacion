/**
 * Utilidades de fecha sin desfases de zona horaria.
 *
 * Un `<input type="date">` entrega "AAAA-MM-DD". `new Date("2026-11-25")` lo
 * interpreta como medianoche UTC, que en Venezuela (UTC-4) cae el día 24: la
 * fecha de entrega se mostraba un día antes. Aquí las fechas sin hora se leen
 * siempre como fecha local.
 */

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Convierte un ISO completo o una fecha "AAAA-MM-DD" (local) en `Date`. */
export function parseFecha(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  const partes = SOLO_FECHA.exec(valor);
  if (partes) {
    const [, anio, mes, dia] = partes;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }
  return new Date(valor);
}

/** "AAAA-MM-DD" de una fecha en la zona horaria local (para inputs de fecha). */
export function fechaInputLocal(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Fecha de hoy + `dias`, en formato de input local. */
export function fechaEnDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fechaInputLocal(fecha);
}

/**
 * ISO 8601 al mediodía local del día elegido. El mediodía mantiene el mismo
 * día calendario en cualquier zona entre UTC-12 y UTC+12 cuando el backend o
 * otro navegador lo vuelvan a formatear.
 */
export function fechaEntregaIso(valor: string): string {
  const fecha = parseFecha(valor);
  fecha.setHours(12, 0, 0, 0);
  return fecha.toISOString();
}

/** `true` si la fecha (sin hora) es anterior al día de hoy. */
export function esAnteriorAHoy(valor: string): boolean {
  const fecha = parseFecha(valor);
  if (Number.isNaN(fecha.getTime())) return false;
  return fechaInputLocal(fecha) < fechaInputLocal();
}

/** Días calendario entre hoy y la fecha (negativo si ya pasó). */
export function diasHasta(valor: string): number {
  const destino = parseFecha(valor);
  const hoy = new Date();
  const a = Date.UTC(destino.getFullYear(), destino.getMonth(), destino.getDate());
  const b = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((a - b) / 86_400_000);
}

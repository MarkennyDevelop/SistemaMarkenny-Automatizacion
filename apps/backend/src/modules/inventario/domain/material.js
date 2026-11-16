// Materias primas (papel, tintas, planchas, insumos de sellos...) y sus
// movimientos de stock. Código de dominio puro.
import { congelarProfundo, aIso } from '../../../shared/domain/inmutable.js';
import { crearUsuarioRef } from '../../../shared/domain/usuario.js';
import { StockInsuficienteError, MaterialesNoRegistradosError, InventarioInvalidoError } from './errores.js';

export const CATEGORIAS_MATERIAL = Object.freeze({
  PAPEL: 'PAPEL',
  TINTA: 'TINTA',
  PLANCHA: 'PLANCHA',
  SUSTRATO: 'SUSTRATO',
  INSUMO_SELLO: 'INSUMO_SELLO',
  OTRO: 'OTRO',
});

export const TIPOS_MOVIMIENTO = Object.freeze({ ENTRADA: 'ENTRADA', SALIDA: 'SALIDA' });

export const TIPOS_REFERENCIA = Object.freeze({ ORDEN_PRODUCCION: 'ORDEN_PRODUCCION', COMPRA: 'COMPRA', AJUSTE: 'AJUSTE' });

/** Evita acumulación de errores de coma flotante (p. ej. litros de tinta). */
export const redondear = (n) => Math.round(n * 10_000) / 10_000;

export function crearMaterial({ id, codigo, nombre, categoria, unidad, stockMinimo = 0, fecha }) {
  if (!id || !codigo?.trim() || !nombre?.trim() || !unidad?.trim()) {
    throw new InventarioInvalidoError('El material requiere id, código, nombre y unidad');
  }
  if (!Object.hasOwn(CATEGORIAS_MATERIAL, categoria)) {
    throw new InventarioInvalidoError(`Categoría de material inválida: "${categoria}"`);
  }
  if (!(stockMinimo >= 0)) throw new InventarioInvalidoError('El stock mínimo no puede ser negativo');
  return congelarProfundo({
    id,
    codigo: codigo.trim(),
    nombre: nombre.trim(),
    categoria,
    unidad: unidad.trim(),
    stockActual: 0,
    stockMinimo,
    version: 1,
    actualizadoEn: aIso(fecha),
  });
}

export function estaBajoMinimo(material) {
  return material.stockActual <= material.stockMinimo;
}

function crearMovimiento({ id, material, tipo, cantidad, stockResultante, referencia, usuario, fecha }) {
  return congelarProfundo({
    id,
    materialId: material.id,
    tipo,
    cantidad,
    stockResultante,
    referencia,
    usuario: crearUsuarioRef(usuario),
    fecha: aIso(fecha),
  });
}

/** Entrada de stock (compra, ajuste positivo). */
export function registrarEntrada(material, { movimientoId, cantidad, referencia = null, usuario, fecha }) {
  if (!(cantidad > 0)) throw new InventarioInvalidoError('La cantidad de entrada debe ser positiva', { cantidad });
  const stockResultante = redondear(material.stockActual + cantidad);
  const actualizado = congelarProfundo({
    ...material,
    stockActual: stockResultante,
    version: material.version + 1,
    actualizadoEn: aIso(fecha),
  });
  const movimiento = crearMovimiento({
    id: movimientoId,
    material,
    tipo: TIPOS_MOVIMIENTO.ENTRADA,
    cantidad,
    stockResultante,
    referencia,
    usuario,
    fecha,
  });
  return { material: actualizado, movimiento };
}

/**
 * Planifica el descuento de varios materiales en bloque (todo o nada).
 * Si falta stock en CUALQUIER material, no se descuenta ninguno.
 *
 * @param {object[]} materiales  Materiales actuales (los requeridos).
 * @param {{ materialId: string, cantidad: number }[]} requeridos
 * @param {{ referencia: object, usuario: object, fecha: Date, generarId: () => string }} contexto
 * @returns {{ cambios: { material: object, versionEsperada: number }[], movimientos: object[] }}
 */
export function planificarDescuento(materiales, requeridos, { referencia, usuario, fecha, generarId }) {
  const porId = new Map(materiales.map((m) => [m.id, m]));
  const noRegistrados = requeridos.filter((r) => !porId.has(r.materialId)).map((r) => r.materialId);
  if (noRegistrados.length > 0) throw new MaterialesNoRegistradosError(noRegistrados);

  // Agrupa por material por si llega el mismo material en varias líneas.
  const totales = new Map();
  for (const r of requeridos) {
    if (!(r.cantidad > 0)) throw new InventarioInvalidoError('La cantidad a descontar debe ser positiva', r);
    totales.set(r.materialId, redondear((totales.get(r.materialId) ?? 0) + r.cantidad));
  }

  const faltantes = [];
  for (const [materialId, requerido] of totales) {
    const disponible = porId.get(materialId).stockActual;
    if (requerido > disponible) faltantes.push({ materialId, requerido, disponible });
  }
  if (faltantes.length > 0) throw new StockInsuficienteError(faltantes);

  const cambios = [];
  const movimientos = [];
  for (const [materialId, cantidad] of totales) {
    const material = porId.get(materialId);
    const stockResultante = redondear(material.stockActual - cantidad);
    cambios.push({
      versionEsperada: material.version,
      material: congelarProfundo({
        ...material,
        stockActual: stockResultante,
        version: material.version + 1,
        actualizadoEn: aIso(fecha),
      }),
    });
    movimientos.push(
      crearMovimiento({
        id: generarId(),
        material,
        tipo: TIPOS_MOVIMIENTO.SALIDA,
        cantidad,
        stockResultante,
        referencia,
        usuario,
        fecha,
      }),
    );
  }
  return { cambios, movimientos };
}

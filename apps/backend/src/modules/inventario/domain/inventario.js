// Dominio de Inventario: materiales, movimientos de stock y productos
// terminados en almacén pendientes de entrega. Código puro.
import {
  CATEGORIAS_INVENTARIO,
  CATEGORIAS_POR_SUPERFICIE,
  DECIMALES_STOCK,
  areaImpresionM2,
  consumoDeSustrato,
  TIPOS_MOVIMIENTO,
  TIPOS_PAPEL,
  TIPOS_PRODUCTO_TERMINADO,
  UNIDADES_MEDIDA,
  stockTrasMovimiento,
} from '@markenny/contrato/dominio';
import { DomainError } from '../../../shared/domain/errors.js';
import { aIso, congelarProfundo } from '../../../shared/domain/inmutable.js';
import { crearActor } from '../../../shared/domain/usuario.js';

/** Montos (costos): NUMERIC(12,2), centésimas. */
export const redondear = (n) => Math.round(n * 100) / 100;
/** Stock y cantidades: NUMERIC(14,3), milésimas (fracciones de rollo). */
const FACTOR_STOCK = 10 ** DECIMALES_STOCK;
export const redondearCantidad = (n) => Math.round(n * FACTOR_STOCK) / FACTOR_STOCK;

function invariante(condicion, mensaje, detalles) {
  if (!condicion) throw new DomainError(mensaje, { codigo: 'REGLA_NEGOCIO', detalles });
}

/* ------------------------------ Materiales ------------------------------ */

/**
 * Materia prima de Markenny: papel (con su tipo), vinil, lona o sello. El
 * inventario no admite maquinaria ni equipos.
 */
export function crearMaterial({ id, sku, nombre, categoria, subtipo = null, unidad, stockMinimo = 0, costoUnitario = 0, rendimiento = null, mermaPorcentaje = 0, ubicacion = '', proveedor = '', lote = '', fecha }) {
  invariante(sku?.trim() && nombre?.trim(), 'El material requiere SKU y nombre');
  invariante(
    CATEGORIAS_INVENTARIO.includes(categoria),
    `Categoría inválida: ${categoria}. El inventario solo registra materias primas (${CATEGORIAS_INVENTARIO.join(', ')})`,
  );
  invariante(categoria !== 'PAPEL' || TIPOS_PAPEL.includes(subtipo), 'Indica el tipo de papel');
  invariante(categoria === 'PAPEL' || !subtipo, 'El tipo de papel solo aplica a materiales PAPEL');
  invariante(UNIDADES_MEDIDA.includes(unidad), `Unidad inválida: ${unidad}`);
  invariante(stockMinimo >= 0 && costoUnitario >= 0, 'Stock mínimo y costo no pueden ser negativos');
  validarConsumo(categoria, { rendimiento, mermaPorcentaje });
  return congelarProfundo({
    id,
    sku: sku.trim().toUpperCase(),
    nombre: nombre.trim(),
    categoria,
    subtipo: categoria === 'PAPEL' ? subtipo : null,
    unidad,
    stock: 0,
    stockMinimo: redondearCantidad(stockMinimo),
    costoUnitario: redondear(costoUnitario),
    rendimiento: rendimiento ?? null,
    mermaPorcentaje,
    ubicacion: ubicacion.trim(),
    proveedor: proveedor.trim(),
    lote: lote.trim(),
    version: 1,
    actualizadoEn: aIso(fecha),
  });
}

function validarConsumo(categoria, { rendimiento, mermaPorcentaje }) {
  invariante(
    rendimiento === null || CATEGORIAS_POR_SUPERFICIE.includes(categoria),
    'El rendimiento en m² solo aplica a viniles y lonas',
  );
  invariante(rendimiento === null || rendimiento > 0, 'El rendimiento debe ser mayor a cero');
  invariante(mermaPorcentaje >= 0 && mermaPorcentaje <= 100, 'La merma debe estar entre 0 y 100 %');
}

/** Define cuántos m² rinde una unidad de stock y la merma del material. */
export function configurarConsumo(material, { rendimiento, mermaPorcentaje, fecha }) {
  validarConsumo(material.categoria, { rendimiento, mermaPorcentaje });
  return congelarProfundo({
    ...material,
    rendimiento,
    mermaPorcentaje,
    version: material.version + 1,
    actualizadoEn: aIso(fecha),
  });
}

/**
 * Consumo de un sustrato para una orden de gran formato.
 * @returns {{ m2: number, cantidad: number | null }} cantidad en la unidad del
 *   material; null si el material no tiene rendimiento configurado.
 */
export function calcularConsumoSustrato(material, { especificaciones, cantidad }) {
  invariante(
    CATEGORIAS_POR_SUPERFICIE.includes(material.categoria),
    `«${material.nombre}» no es un vinil ni una lona: no puede ser sustrato de gran formato`,
  );
  const m2 = areaImpresionM2(especificaciones, cantidad);
  invariante(m2 !== null, 'La orden necesita ancho, alto y unidad para calcular el consumo del sustrato');
  return { m2, cantidad: consumoDeSustrato(material, m2) };
}

/**
 * Aplica un movimiento a un material. Nunca deja stock negativo: lo rechaza
 * con STOCK_INSUFICIENTE (antes, en el mock, se truncaba a cero en silencio).
 */
export function aplicarMovimiento(material, { id, tipo, cantidad, motivo, ordenId = null, actor, fecha }) {
  invariante(TIPOS_MOVIMIENTO.includes(tipo), `Tipo de movimiento inválido: ${tipo}`);
  invariante(cantidad > 0, 'La cantidad debe ser mayor a cero');
  const responsable = crearActor(actor);
  const cant = redondearCantidad(cantidad);
  invariante(cant > 0, 'La cantidad debe ser mayor a cero');
  const resultante = redondearCantidad(stockTrasMovimiento(material.stock, tipo, cant));
  if (resultante < 0) {
    throw new DomainError(
      `Stock insuficiente de «${material.nombre}»: hay ${material.stock} ${material.unidad} y se piden ${cant}`,
      { codigo: 'STOCK_INSUFICIENTE', detalles: { materialId: material.id, disponible: material.stock, requerido: cant } },
    );
  }
  const fechaIso = aIso(fecha);
  return {
    material: congelarProfundo({ ...material, stock: resultante, version: material.version + 1, actualizadoEn: fechaIso }),
    movimiento: congelarProfundo({
      id,
      materialId: material.id,
      materialNombre: material.nombre,
      tipo,
      cantidad: cant,
      stockResultante: resultante,
      motivo: motivo.trim(),
      ordenId,
      usuarioId: responsable.id,
      usuario: responsable.nombre,
      fecha: fechaIso,
    }),
  };
}

/**
 * Descuento de materias primas de una orden: todo o nada. Si falta stock de
 * un material, no se descuenta ninguno.
 */
/**
 * Comprueba que existan los materiales y alcance el stock para todos los
 * requeridos (agrupados por material). Sin efectos.
 * @returns {Map<string, number>} cantidad total por material
 */
export function verificarStock(materiales, requeridos) {
  const porId = new Map(materiales.map((m) => [m.id, m]));
  const faltan = requeridos.filter((r) => !porId.has(r.materialId)).map((r) => r.materialId);
  if (faltan.length) {
    throw new DomainError('Hay materiales de la orden que no existen en inventario', {
      codigo: 'NO_ENCONTRADO',
      detalles: { materialIds: faltan },
    });
  }
  const totales = new Map();
  for (const r of requeridos) totales.set(r.materialId, redondearCantidad((totales.get(r.materialId) ?? 0) + r.cantidad));

  const insuficientes = [...totales]
    .filter(([id, cant]) => cant > porId.get(id).stock)
    .map(([id, cant]) => ({ materialId: id, requerido: cant, disponible: porId.get(id).stock }));
  if (insuficientes.length) {
    const numero = (n) => n.toLocaleString('es-VE', { maximumFractionDigits: DECIMALES_STOCK });
    const detalle = insuficientes
      .map(({ materialId, requerido, disponible }) => {
        const m = porId.get(materialId);
        return `«${m.nombre}»: la orden necesita ${numero(requerido)} ${m.unidad} y hay ${numero(disponible)}`;
      })
      .join('; ');
    throw new DomainError(`Stock insuficiente. ${detalle}.`, {
      codigo: 'STOCK_INSUFICIENTE',
      detalles: { faltantes: insuficientes },
    });
  }

  return totales;
}

export function planificarDescuento(materiales, requeridos, { ordenId, codigo, actor, fecha, generarId }) {
  const porId = new Map(materiales.map((m) => [m.id, m]));
  const totales = verificarStock(materiales, requeridos);

  const cambios = [];
  const movimientos = [];
  for (const [id, cantidad] of totales) {
    const original = porId.get(id);
    const r = aplicarMovimiento(original, {
      id: generarId(),
      tipo: 'SALIDA',
      cantidad,
      motivo: `Consumo ${codigo}`,
      ordenId,
      actor,
      fecha,
    });
    cambios.push({ material: r.material, versionEsperada: original.version });
    movimientos.push(r.movimiento);
  }
  return { cambios, movimientos };
}

/* ------------------- Productos terminados (almacén) -------------------- */

function estadoSegun(cantidad, entregada) {
  if (entregada === 0) return 'PENDIENTE';
  return entregada < cantidad ? 'PARCIAL' : 'ENTREGADO';
}

/** Disponibilidad para las fichas de venta: sin costos, proveedor ni lote. */
export function aDisponibilidad(material) {
  return {
    id: material.id,
    nombre: material.nombre,
    categoria: material.categoria,
    subtipo: material.subtipo ?? null,
    unidad: material.unidad,
    stock: material.stock,
    disponible: material.stock > 0,
    rendimiento: material.rendimiento ?? null,
    mermaPorcentaje: material.mermaPorcentaje ?? 0,
  };
}

export function crearProductoTerminado({ id, tipo, ordenId = null, codigoOrden = null, clienteId = null, clienteNombre = null, descripcion, cantidad, ubicacion = null, fecha }) {
  invariante(TIPOS_PRODUCTO_TERMINADO.includes(tipo), `Tipo de producto inválido: ${tipo}`);
  invariante(descripcion?.trim(), 'El producto requiere una descripción');
  invariante(Number.isInteger(cantidad) && cantidad > 0, 'La cantidad debe ser un entero positivo');
  return congelarProfundo({
    id,
    tipo,
    ordenId,
    codigoOrden,
    clienteId,
    clienteNombre,
    descripcion: descripcion.trim(),
    cantidad,
    cantidadEntregada: 0,
    ubicacion,
    estadoEntrega: 'PENDIENTE',
    ingresadoEn: aIso(fecha),
    version: 1,
    entregas: [],
  });
}

/** Entrega total o parcial al cliente. */
export function registrarEntrega(producto, { id, cantidad, recibidoPor = null, actor, fecha }) {
  const responsable = crearActor(actor);
  const pendiente = producto.cantidad - producto.cantidadEntregada;
  const error = (mensaje) => new DomainError(mensaje, { codigo: 'ENTREGA_INVALIDA', detalles: { pendiente, cantidad } });
  if (pendiente === 0) throw error('El producto ya se entregó por completo');
  if (!Number.isInteger(cantidad) || cantidad <= 0) throw error('La cantidad a entregar debe ser un entero positivo');
  if (cantidad > pendiente) throw error(`Solo quedan ${pendiente} unidades por entregar`);

  const entregada = producto.cantidadEntregada + cantidad;
  const entrega = {
    id,
    cantidad,
    recibidoPor: recibidoPor?.trim() || null,
    usuarioId: responsable.id,
    usuario: responsable.nombre,
    fecha: aIso(fecha),
  };
  return congelarProfundo({
    ...producto,
    cantidadEntregada: entregada,
    estadoEntrega: estadoSegun(producto.cantidad, entregada),
    version: producto.version + 1,
    entregas: [...producto.entregas, entrega],
  });
}

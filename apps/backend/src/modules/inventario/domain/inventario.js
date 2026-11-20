// Dominio de Inventario: materiales, movimientos de stock y productos
// terminados en almacén pendientes de entrega. Código puro.
import {
  CATEGORIAS_INVENTARIO,
  TIPOS_MOVIMIENTO,
  TIPOS_PRODUCTO_TERMINADO,
  UNIDADES_MEDIDA,
  stockTrasMovimiento,
} from '@markenny/contrato/dominio';
import { DomainError } from '../../../shared/domain/errors.js';
import { aIso, congelarProfundo } from '../../../shared/domain/inmutable.js';
import { crearActor } from '../../../shared/domain/usuario.js';

/** Las columnas son NUMERIC(12,2): todo se redondea a centésimas. */
export const redondear = (n) => Math.round(n * 100) / 100;

function invariante(condicion, mensaje, detalles) {
  if (!condicion) throw new DomainError(mensaje, { codigo: 'REGLA_NEGOCIO', detalles });
}

/* ------------------------------ Materiales ------------------------------ */

export function crearMaterial({ id, sku, nombre, categoria, unidad, stockMinimo = 0, costoUnitario = 0, ubicacion = '', proveedor = '', lote = '', fecha }) {
  invariante(sku?.trim() && nombre?.trim(), 'El material requiere SKU y nombre');
  invariante(CATEGORIAS_INVENTARIO.includes(categoria), `Categoría inválida: ${categoria}`);
  invariante(UNIDADES_MEDIDA.includes(unidad), `Unidad inválida: ${unidad}`);
  invariante(stockMinimo >= 0 && costoUnitario >= 0, 'Stock mínimo y costo no pueden ser negativos');
  return congelarProfundo({
    id,
    sku: sku.trim().toUpperCase(),
    nombre: nombre.trim(),
    categoria,
    unidad,
    stock: 0,
    stockMinimo: redondear(stockMinimo),
    costoUnitario: redondear(costoUnitario),
    ubicacion: ubicacion.trim(),
    proveedor: proveedor.trim(),
    lote: lote.trim(),
    version: 1,
    actualizadoEn: aIso(fecha),
  });
}

/**
 * Aplica un movimiento a un material. Nunca deja stock negativo: lo rechaza
 * con STOCK_INSUFICIENTE (antes, en el mock, se truncaba a cero en silencio).
 */
export function aplicarMovimiento(material, { id, tipo, cantidad, motivo, ordenId = null, actor, fecha }) {
  invariante(TIPOS_MOVIMIENTO.includes(tipo), `Tipo de movimiento inválido: ${tipo}`);
  invariante(cantidad > 0, 'La cantidad debe ser mayor a cero');
  const responsable = crearActor(actor);
  const cant = redondear(cantidad);
  const resultante = redondear(stockTrasMovimiento(material.stock, tipo, cant));
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
export function planificarDescuento(materiales, requeridos, { ordenId, codigo, actor, fecha, generarId }) {
  const porId = new Map(materiales.map((m) => [m.id, m]));
  const faltan = requeridos.filter((r) => !porId.has(r.materialId)).map((r) => r.materialId);
  if (faltan.length) {
    throw new DomainError('Hay materiales de la orden que no existen en inventario', {
      codigo: 'NO_ENCONTRADO',
      detalles: { materialIds: faltan },
    });
  }
  const totales = new Map();
  for (const r of requeridos) totales.set(r.materialId, redondear((totales.get(r.materialId) ?? 0) + r.cantidad));

  const insuficientes = [...totales]
    .filter(([id, cant]) => cant > porId.get(id).stock)
    .map(([id, cant]) => ({ materialId: id, requerido: cant, disponible: porId.get(id).stock }));
  if (insuficientes.length) {
    throw new DomainError(`Stock insuficiente para ${insuficientes.length} material(es)`, {
      codigo: 'STOCK_INSUFICIENTE',
      detalles: { faltantes: insuficientes },
    });
  }

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

export function crearProductoTerminado({ id, tipo = 'PRODUCTO_TERMINADO', ordenId = null, codigoOrden = null, clienteId = null, clienteNombre = null, descripcion, cantidad, ubicacion = null, fecha }) {
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

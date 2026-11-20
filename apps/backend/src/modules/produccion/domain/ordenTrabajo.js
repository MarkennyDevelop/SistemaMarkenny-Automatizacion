// Agregado OrdenTrabajo y su máquina de estados de control de calidad.
// Código de dominio puro y determinista: el reloj, los ids y el actor entran
// como argumentos; ninguna función muta la orden recibida.
import {
  FASE_INICIAL,
  FASES,
  TRANSICIONES,
  requiereMotivo,
} from '@markenny/contrato/dominio';
import { DomainError } from '../../../shared/domain/errors.js';
import { aIso, congelarProfundo } from '../../../shared/domain/inmutable.js';
import { crearActor, exigirRol } from '../../../shared/domain/usuario.js';

function invariante(condicion, mensaje, detalles) {
  if (!condicion) throw new DomainError(mensaje, { codigo: 'REGLA_NEGOCIO', detalles });
}

function crearEvento({ id, fase, anterior, actor, fecha, nota }) {
  const a = crearActor(actor);
  return {
    id,
    fase,
    anterior,
    usuarioId: a.id,
    usuario: a.nombre,
    rol: a.rol,
    fecha: aIso(fecha),
    nota: nota?.trim() ? nota.trim() : null,
  };
}

/**
 * Crea la orden de trabajo en EN_PROCESO con su primer evento de auditoría.
 * Solo Vendedor o Administrador pueden crearla; el vendedor es quien la crea.
 */
export function crearOrdenTrabajo({ id, codigo, eventoId, cliente, actor, datos, fecha }) {
  const vendedor = exigirRol(actor, ['VENDEDOR', 'ADMIN'], 'crear órdenes de trabajo');
  invariante(/^OT-\d{4}-\d{4,}$/.test(codigo), 'Código de orden inválido', { codigo });
  invariante(cliente && cliente.id && cliente.nombre, 'La orden debe tener un cliente');
  invariante(Number.isInteger(datos.cantidad) && datos.cantidad > 0, 'La cantidad debe ser un entero positivo');
  invariante(datos.montoTotal >= 0, 'El monto no puede ser negativo');

  const especificaciones = { ...(datos.especificaciones ?? {}) };
  return congelarProfundo({
    id,
    codigo,
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    clienteTelefono: cliente.telefono ?? null,
    vendedorId: vendedor.id,
    vendedor: vendedor.nombre,
    categoriaTrabajo: datos.categoriaTrabajo,
    producto: datos.producto.trim(),
    descripcion: (datos.descripcion ?? '').trim(),
    tecnologia: datos.tecnologia,
    prioridad: datos.prioridad,
    maquina: datos.maquina,
    operador: null,
    cantidad: datos.cantidad,
    sustrato: datos.sustrato,
    tintas: [...datos.tintas],
    acabados: [...datos.acabados],
    especificaciones,
    montoTotal: Math.round(datos.montoTotal * 100) / 100,
    fase: FASE_INICIAL,
    estadoEntrega: 'NO_APLICA',
    fechaCreacion: aIso(fecha),
    fechaEntrega: datos.fechaEntrega,
    fechaFinalizado: null,
    version: 1,
    historial: [
      crearEvento({ id: eventoId, fase: FASE_INICIAL, anterior: null, actor: vendedor, fecha, nota: 'Orden creada y enviada a taller' }),
    ],
  });
}

/**
 * Cambia la fase de la orden.
 * - Solo Producción o Administrador.
 * - Solo transiciones de TRANSICIONES (una fase hacia adelante, o el retrabajo
 *   EN_REVISION -> EN_PROCESO, que exige nota con el motivo).
 * - La fecha no puede ser anterior al último evento (auditoría monótona).
 */
export function transicionar(orden, { hacia, actor, nota, fecha, eventoId }) {
  const operario = exigirRol(actor, ['PRODUCCION', 'ADMIN'], 'cambiar la fase de una orden');
  const desde = orden.fase;
  invariante(FASES.includes(desde), `Fase desconocida: ${desde}`);
  const permitidas = TRANSICIONES[desde];

  if (!permitidas.includes(hacia)) {
    const detalle =
      permitidas.length === 0
        ? 'la orden ya está empaquetada'
        : `desde ${desde} solo se permite ${permitidas.join(' o ')}`;
    throw new DomainError(`No se puede pasar de ${desde} a ${hacia}: ${detalle}`, {
      codigo: 'TRANSICION_NO_PERMITIDA',
      detalles: { desde, hacia, permitidas: [...permitidas] },
    });
  }
  if (requiereMotivo(desde, hacia) && !(nota?.trim().length >= 3)) {
    throw new DomainError('Para devolver la orden a proceso indica el motivo del rechazo de calidad', {
      codigo: 'MOTIVO_REQUERIDO',
      detalles: { desde, hacia },
    });
  }

  const fechaIso = aIso(fecha);
  const ultimo = orden.historial.at(-1);
  invariante(!ultimo || fechaIso >= ultimo.fecha, 'La fecha del cambio es anterior al último registro de auditoría');

  return congelarProfundo({
    ...orden,
    fase: hacia,
    // Al empaquetar, el pedido entra al almacén y queda pendiente de entrega.
    estadoEntrega: hacia === 'EMPAQUETADO' ? 'PENDIENTE' : orden.estadoEntrega,
    fechaFinalizado: hacia === 'FINALIZADO' ? fechaIso : hacia === 'EN_PROCESO' ? null : orden.fechaFinalizado,
    version: orden.version + 1,
    historial: [...orden.historial, crearEvento({ id: eventoId, fase: hacia, anterior: desde, actor: operario, fecha, nota })],
  });
}

/** Refleja en la orden el avance de la entrega registrado por almacén. */
export function registrarEstadoEntrega(orden, estadoEntrega) {
  invariante(orden.fase === 'EMPAQUETADO', 'Solo una orden empaquetada puede entregarse');
  invariante(['PENDIENTE', 'PARCIAL', 'ENTREGADO'].includes(estadoEntrega), `Estado de entrega inválido: ${estadoEntrega}`);
  return congelarProfundo({ ...orden, estadoEntrega });
}

/** Un vendedor solo accede a sus órdenes; Admin y Producción, a todas. */
export function puedeVer(orden, actor) {
  return actor.rol !== 'VENDEDOR' || orden.vendedorId === actor.id;
}

// Agregado OrdenTrabajo y su máquina de estados de control de calidad.
// Código de dominio puro y determinista: el reloj, los ids y el actor entran
// como argumentos; ninguna función muta la orden recibida.
import {
  FASE_INICIAL,
  FASES,
  ROLES_CAMBIO_FASE,
  TRANSICIONES,
  esRetrabajo,
  productoTerminadoDe,
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
  const tecnologiaPorDefecto = datos.categoriaTrabajo === 'GRAN_FORMATO' ? 'GRAN_FORMATO' : 'OFFSET';
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
    tecnologia: datos.tecnologia ?? tecnologiaPorDefecto,
    productoTerminado: datos.productoTerminado ?? productoTerminadoDe(datos.categoriaTrabajo, especificaciones),
    prioridad: datos.prioridad ?? 'MEDIA',
    maquina: datos.maquina?.trim() || null,
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
    notas: [],
  });
}

/**
 * Cambia la fase de la orden.
 * - Solo Producción o Administrador (ROLES_CAMBIO_FASE). El Vendedor no puede
 *   autorizar cambios: solo pedirlos con una nota (ver `agregarNota`).
 * - Solo transiciones de TRANSICIONES: una fase hacia adelante, o el retrabajo
 *   hacia EN_PROCESO desde EN_REVISION o FINALIZADO (defecto o daño), que
 *   exige nota con el motivo y obliga a revisar y finalizar de nuevo.
 * - La fecha no puede ser anterior al último evento (auditoría monótona).
 */
export function transicionar(orden, { hacia, actor, nota, fecha, eventoId }) {
  const operario = exigirRol(actor, ROLES_CAMBIO_FASE, 'cambiar la fase de una orden');
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
    throw new DomainError('Para devolver la orden a proceso indica el motivo (defecto, daño o rechazo de calidad)', {
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
    // En un retrabajo se borra la fecha de finalizado: volverá a fijarse al finalizar de nuevo.
    fechaFinalizado: hacia === 'FINALIZADO' ? fechaIso : esRetrabajo(desde, hacia) ? null : orden.fechaFinalizado,
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

/**
 * Nota en la orden: observación o solicitud de revisión/retrabajo. Cualquier
 * rol que pueda ver la orden puede anotar; las notas no cambian la fase ni la
 * versión (no compiten con los cambios de Producción).
 */
export function agregarNota(orden, { id, mensaje, solicitaRetrabajo = false, actor, fecha }) {
  const autor = crearActor(actor);
  const texto = mensaje?.trim() ?? '';
  invariante(texto.length >= 3 && texto.length <= 500, 'La nota debe tener entre 3 y 500 caracteres');
  invariante(!(solicitaRetrabajo && orden.fase === 'EMPAQUETADO'), 'Una orden empaquetada ya no admite retrabajo');
  const nota = {
    id,
    mensaje: texto,
    solicitaRetrabajo: Boolean(solicitaRetrabajo),
    usuarioId: autor.id,
    usuario: autor.nombre,
    rol: autor.rol,
    fecha: aIso(fecha),
  };
  return { orden: congelarProfundo({ ...orden, notas: [...orden.notas, nota] }), nota: congelarProfundo(nota) };
}

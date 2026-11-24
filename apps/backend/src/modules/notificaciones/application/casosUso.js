// Casos de uso de notificaciones y reacciones a eventos de otros módulos.
import { z } from 'zod';
import { NotificacionSchema, ResultadoMarcarLeidasSchema } from '@markenny/contrato';
import { FASES_CON_AVISO } from '@markenny/contrato/dominio';
import { casoDeUso } from '../../../shared/application/validacion.js';
import { ActorSchema } from '../../../shared/application/actor.js';
import { RecursoNoEncontradoError } from '../../../shared/domain/errors.js';
import { crearNotificacion } from '../domain/notificacion.js';

/**
 * @typedef {Object} NotificacionRepositoryPort
 * @property {(n: object) => Promise<void>} crear
 * @property {(usuario: { id: string, rol: string }, limite: number) => Promise<object[]>} listarPara  Con `leida` resuelto.
 * @property {(id: string, usuario: object) => Promise<object|null>} marcarLeida  null si no existe o no es visible.
 * @property {(usuario: object) => Promise<number>} marcarTodas
 */
export const NOTIFICACION_REPOSITORY_PORT = Object.freeze(['crear', 'listarPara', 'marcarLeida', 'marcarTodas']);

export function crearCasosUsoNotificaciones({ notificaciones, reloj, ids }) {
  const notificar = (datos) => notificaciones.crear(crearNotificacion({ ...datos, id: ids.generar(), fecha: reloj.ahora() }));

  return {
    listar: casoDeUso({
      nombre: 'notificaciones.listar',
      entrada: z.object({ actor: ActorSchema }).strict(),
      salida: z.array(NotificacionSchema),
      ejecutar: ({ actor }) => notificaciones.listarPara(actor, 100),
    }),

    marcarLeida: casoDeUso({
      nombre: 'notificaciones.marcarLeida',
      entrada: z.object({ id: z.string().uuid(), actor: ActorSchema }).strict(),
      salida: NotificacionSchema,
      async ejecutar({ id, actor }) {
        const n = await notificaciones.marcarLeida(id, actor);
        if (!n) throw new RecursoNoEncontradoError('Notificación', id);
        return n;
      },
    }),

    marcarTodas: casoDeUso({
      nombre: 'notificaciones.marcarTodas',
      entrada: z.object({ actor: ActorSchema }).strict(),
      salida: ResultadoMarcarLeidasSchema,
      ejecutar: async ({ actor }) => ({ marcadas: await notificaciones.marcarTodas(actor) }),
    }),

    /* ---------------------- Reacciones a eventos ---------------------- */

    alCrearOrden: ({ ordenId, codigo, producto, clienteNombre }) =>
      notificar({
        tipo: 'FASE',
        titulo: 'Nueva orden recibida en taller',
        detalle: `${codigo} · ${producto} · ${clienteNombre}`,
        ordenId,
        codigo,
        roles: ['ADMIN', 'PRODUCCION'],
      }),

    async alActualizarOrden({ ordenId, codigo, producto, clienteNombre, vendedorId, fase, anterior }) {
      if (anterior === 'EN_REVISION' && fase === 'EN_PROCESO') {
        return notificar({
          tipo: 'FASE',
          titulo: 'Orden devuelta a producción por calidad',
          detalle: `${codigo} · ${producto} · ${clienteNombre}`,
          ordenId,
          codigo,
          roles: ['VENDEDOR', 'ADMIN'],
          destinatarioId: vendedorId,
        });
      }
      if (!anterior || !FASES_CON_AVISO.includes(fase)) return undefined;
      return notificar({
        tipo: 'PEDIDO_LISTO',
        titulo:
          fase === 'EMPAQUETADO'
            ? 'Pedido empaquetado y listo para entrega'
            : 'Producción finalizada, lista para empaque',
        detalle: `${codigo} · ${producto} · ${clienteNombre}`,
        ordenId,
        codigo,
        roles: ['VENDEDOR', 'ADMIN'],
        destinatarioId: vendedorId,
      });
    },

    /**
     * Nota en una orden. Si la escribe el vendedor, avisa a Producción y
     * Administración (que deciden el retrabajo); si la escribe Producción o
     * Administración, avisa al vendedor de esa orden.
     */
    alAgregarNota: ({ ordenId, codigo, producto, mensaje, solicitaRetrabajo, vendedorId, actor }) => {
      const delVendedor = actor.rol === 'VENDEDOR';
      return notificar({
        tipo: 'FASE',
        titulo: solicitaRetrabajo
          ? `Solicitud de revisión/retrabajo · ${codigo}`
          : `Nueva observación en ${codigo}`,
        detalle: `${actor.nombre}: ${mensaje}`.slice(0, 300) || producto,
        ordenId,
        codigo,
        roles: delVendedor ? ['ADMIN', 'PRODUCCION'] : ['VENDEDOR', 'ADMIN'],
        destinatarioId: delVendedor ? null : vendedorId,
      });
    },

    alFallarDescuento: ({ ordenId, mensaje, codigoError }) =>
      notificar({
        tipo: 'STOCK',
        titulo:
          codigoError === 'SIN_RENDIMIENTO'
            ? 'Orden creada sin descontar el sustrato: falta su rendimiento'
            : 'No se pudieron descontar materiales de una orden',
        detalle: mensaje,
        ordenId,
        roles: ['ADMIN', 'PRODUCCION'],
      }),
  };
}

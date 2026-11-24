// API pública del módulo de Notificaciones.
import { implementaPuerto, PUERTOS } from '../../shared/application/ports.js';
import { actorDe } from '../../shared/application/actor.js';
import { EVENTOS } from '../../shared/events/catalogo.js';
import { NOTIFICACION_REPOSITORY_PORT, crearCasosUsoNotificaciones } from './application/casosUso.js';

export { NotificacionRepositoryMemoria, NotificacionRepositoryPostgres } from './infra/repositorios.js';

export function crearModuloNotificaciones({ notificaciones, eventBus, reloj, ids }) {
  const casosUso = crearCasosUsoNotificaciones({
    notificaciones: implementaPuerto('NotificacionRepository', NOTIFICACION_REPOSITORY_PORT, notificaciones),
    reloj: implementaPuerto('Clock', PUERTOS.Clock, reloj),
    ids: implementaPuerto('IdGenerator', PUERTOS.IdGenerator, ids),
  });

  const suscripciones = [
    eventBus.suscribir(EVENTOS.ORDEN_CREADA, ({ payload }) => casosUso.alCrearOrden(payload)),
    eventBus.suscribir(EVENTOS.ORDEN_ACTUALIZADA, ({ payload }) => casosUso.alActualizarOrden(payload)),
    eventBus.suscribir(EVENTOS.NOTA_AGREGADA, ({ payload }) => casosUso.alAgregarNota(payload)),
    eventBus.suscribir(EVENTOS.DESCUENTO_MATERIALES_FALLIDO, ({ payload }) => casosUso.alFallarDescuento(payload)),
  ];

  const manejadores = {
    listarNotificaciones: ({ usuario }) => casosUso.listar({ actor: actorDe(usuario) }),
    marcarNotificacionLeida: ({ params, usuario }) => casosUso.marcarLeida({ id: params.id, actor: actorDe(usuario) }),
    marcarNotificacionesLeidas: ({ usuario }) => casosUso.marcarTodas({ actor: actorDe(usuario) }),
  };

  return { casosUso, manejadores, desuscribir: () => suscripciones.forEach((quitar) => quitar()) };
}

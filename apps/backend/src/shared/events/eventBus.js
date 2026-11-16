// Adaptador del EventBusPort sobre EventEmitter de Node (bus interno del monolito).
//
// Características:
//  - Publicación ASÍNCRONA: `publicar` retorna inmediatamente; los manejadores
//    corren en un tick posterior (setImmediate), desacoplando al emisor.
//  - Aislamiento de fallos: un manejador que lanza no afecta a otros ni al
//    emisor; el error se registra en el logger.
//  - Contratos: si el tipo está en el catálogo, el payload se valida con Zod
//    ANTES de publicar (un publicador no puede emitir datos inválidos).
//  - `esperarInactividad()` permite a pruebas y al apagado ordenado esperar a
//    que terminen todos los manejadores en curso.
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { PAYLOADS } from './catalogo.js';
import { validarContrato } from '../application/validacion.js';

const loggerNulo = { info() {}, warn() {}, error() {} };

export class NodeEventBus {
  #emitter = new EventEmitter({ captureRejections: false });
  #pendientes = new Set();
  #logger;
  #contratos;
  #reloj;

  constructor({ logger = loggerNulo, contratos = PAYLOADS, reloj = { ahora: () => new Date() } } = {}) {
    this.#logger = logger;
    this.#contratos = contratos;
    this.#reloj = reloj;
    this.#emitter.setMaxListeners(50);
  }

  publicar(tipo, payload) {
    const esquema = this.#contratos[tipo];
    const datos = esquema ? validarContrato(esquema, payload, `evento:${tipo}`) : payload;
    const evento = Object.freeze({
      id: randomUUID(),
      tipo,
      payload: datos,
      ocurridoEn: this.#reloj.ahora().toISOString(),
    });

    for (const manejador of this.#emitter.listeners(tipo)) {
      const ejecucion = new Promise((resolve) => setImmediate(resolve))
        .then(() => manejador(evento))
        .catch((err) => {
          this.#logger.error({ err, evento: tipo, eventoId: evento.id }, 'Manejador de evento falló');
        })
        .finally(() => this.#pendientes.delete(ejecucion));
      this.#pendientes.add(ejecucion);
    }
  }

  suscribir(tipo, manejador) {
    this.#emitter.on(tipo, manejador);
    return () => this.#emitter.off(tipo, manejador);
  }

  /** Resuelve cuando no queda ningún manejador en ejecución (incluye eventos encadenados). */
  async esperarInactividad() {
    while (this.#pendientes.size > 0) {
      await Promise.all([...this.#pendientes]);
    }
  }
}

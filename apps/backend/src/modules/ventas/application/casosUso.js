// Casos de uso del módulo de Ventas (cartera de clientes).
import { z } from 'zod';
import { ClienteSchema, NuevoClienteSchema } from '@markenny/contrato';
import { casoDeUso } from '../../../shared/application/validacion.js';
import { ActorSchema } from '../../../shared/application/actor.js';
import { crearCliente } from '../domain/cliente.js';

/**
 * @typedef {Object} ClienteRepositoryPort
 * @property {() => Promise<object[]>} listar
 * @property {(id: string) => Promise<object|null>} obtenerPorId
 * @property {(cliente: object) => Promise<void>} crear  Lanza CODIGO_DUPLICADO si el RIF existe.
 */
export const CLIENTE_REPOSITORY_PORT = Object.freeze(['listar', 'obtenerPorId', 'crear']);

/**
 * @param {{ clientes: any, reloj: any, ids: any,
 *   resumenOrdenes: () => Promise<Map<string, { activas: number, saldo: number }>> }} deps
 *   `resumenOrdenes` lo aporta Producción (dueño de las órdenes) por su interfaz pública.
 */
export function crearCasosUsoVentas({ clientes, reloj, ids, resumenOrdenes }) {
  const aDTO = (cliente, resumen) => ({
    id: cliente.id,
    nombre: cliente.nombre,
    rif: cliente.rif,
    contacto: cliente.contacto,
    telefono: cliente.telefono,
    email: cliente.email,
    ciudad: cliente.ciudad,
    ordenesActivas: resumen?.activas ?? 0,
    saldoPendiente: resumen?.saldo ?? 0,
    creadoEn: cliente.creadoEn,
  });

  return {
    listarClientes: casoDeUso({
      nombre: 'ventas.listarClientes',
      entrada: z.object({}).strict(),
      salida: z.array(ClienteSchema),
      async ejecutar() {
        const [lista, resumen] = await Promise.all([clientes.listar(), resumenOrdenes()]);
        return lista
          .map((c) => aDTO(c, resumen.get(c.id)))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
    }),

    crearCliente: casoDeUso({
      nombre: 'ventas.crearCliente',
      entrada: NuevoClienteSchema.extend({ actor: ActorSchema }),
      salida: ClienteSchema,
      async ejecutar({ actor, ...datos }) {
        const cliente = crearCliente({ ...datos, id: ids.generar(), creadoPor: actor.id, fecha: reloj.ahora() });
        await clientes.crear(cliente);
        return aDTO(cliente);
      },
    }),

    /** Interfaz pública para otros módulos (Producción necesita el cliente al crear una OT). */
    async obtenerCliente(id) {
      return clientes.obtenerPorId(id);
    },
  };
}

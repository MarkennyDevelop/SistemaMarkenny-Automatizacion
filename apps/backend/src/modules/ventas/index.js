// API pública del módulo de Ventas (pedidos, cotizaciones, clientes).
//
// Esqueleto: la estructura hexagonal (domain / application / infra / schemas)
// está creada; los casos de uso se implementarán en la siguiente fase. Este
// módulo será el origen de la aprobación de órdenes de trabajo: invocará el
// caso de uso público `produccion.aprobarOrdenTrabajo` o publicará un evento.

export function crearModuloVentas() {
  async function plugin(fastify) {
    await fastify.register(
      async (f) => {
        f.get('/estado', async () => ({ modulo: 'ventas', estado: 'en construcción' }));
      },
      { prefix: '/v1/ventas' },
    );
  }
  return { casosUso: Object.freeze({}), plugin };
}

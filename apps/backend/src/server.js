// Punto de entrada del backend.
import { cargarConfig } from './config/env.js';
import { construirApp } from './app.js';

const config = cargarConfig();
const app = await construirApp({ config });

if (!config.DATABASE_URL) {
  app.log.warn('DATABASE_URL no definida: usando repositorios EN MEMORIA (los datos se pierden al reiniciar)');
}

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.once(senal, async () => {
    app.log.info(`Recibida ${senal}, cerrando...`);
    await app.close();
    process.exit(0);
  });
}

await app.listen({ host: config.HOST, port: config.PORT });

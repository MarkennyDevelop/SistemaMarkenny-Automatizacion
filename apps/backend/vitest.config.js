import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
    // Las pruebas de PostgreSQL comparten base de datos: no paralelizar archivos.
    fileParallelism: false,
  },
});

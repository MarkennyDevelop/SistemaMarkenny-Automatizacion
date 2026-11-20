// Uso: npm run openapi  → escribe ../../docs/api/openapi.json
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generarOpenApi } from '../src/openapi.js';

const destino = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/api/openapi.json');
await mkdir(path.dirname(destino), { recursive: true });
await writeFile(destino, JSON.stringify(generarOpenApi(), null, 2) + '\n');
console.log(`OpenAPI escrito en ${path.relative(process.cwd(), destino)}`);

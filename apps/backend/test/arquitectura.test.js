// Reglas de dependencia del documento de arquitectura, verificadas en cada prueba.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const MODULOS = readdirSync(path.join(SRC, 'modules'));
/** Única dependencia externa permitida en el dominio: las reglas puras del contrato. */
const PERMITIDO_EN_DOMINIO = '@markenny/contrato/dominio';

const archivosJs = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? archivosJs(p) : p.endsWith('.js') ? [p] : [];
  });
const importsDe = (archivo) =>
  [...readFileSync(archivo, 'utf8').matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);
const rel = (p) => path.relative(SRC, p);

describe('el dominio es código puro', () => {
  const archivos = [path.join(SRC, 'shared/domain'), ...MODULOS.map((m) => path.join(SRC, 'modules', m, 'domain'))].flatMap(archivosJs);

  it.each(archivos.map((a) => [rel(a), a]))('%s', (_n, archivo) => {
    for (const imp of importsDe(archivo)) {
      if (imp === PERMITIDO_EN_DOMINIO) continue;
      expect(imp, `${rel(archivo)} importa "${imp}"`).toMatch(/^\./);
      const destino = rel(path.resolve(path.dirname(archivo), imp));
      expect(destino).toMatch(/^(shared\/domain\/|modules\/[^/]+\/domain\/)/);
      const propio = rel(archivo).match(/^modules\/([^/]+)/)?.[1];
      const ajeno = destino.match(/^modules\/([^/]+)/)?.[1];
      if (propio && ajeno) expect(ajeno).toBe(propio);
    }
  });

  it('el contrato de dominio no arrastra dependencias', () => {
    const fuente = readFileSync(path.resolve(SRC, '../../../packages/contrato/src/dominio.js'), 'utf8');
    expect(fuente).not.toMatch(/^\s*import\s/m);
  });
});

describe('aislamiento entre módulos', () => {
  const archivos = MODULOS.flatMap((m) => archivosJs(path.join(SRC, 'modules', m)).map((a) => [rel(a), m, a]));

  it.each(archivos)('%s no importa otros módulos', (_n, modulo, archivo) => {
    for (const imp of importsDe(archivo).filter((i) => i.startsWith('.'))) {
      const otro = rel(path.resolve(path.dirname(archivo), imp)).match(/^modules\/([^/]+)/)?.[1];
      if (otro) expect(otro, `${rel(archivo)} → ${imp}`).toBe(modulo);
    }
  });

  it('la capa de aplicación no depende de infraestructura', () => {
    for (const m of MODULOS) {
      for (const archivo of archivosJs(path.join(SRC, 'modules', m, 'application'))) {
        for (const imp of importsDe(archivo)) expect(imp, rel(archivo)).not.toMatch(/\/infra\/|^fastify|^pg$|^@fastify|shared\/db\//);
      }
    }
  });
});

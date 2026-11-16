// Pruebas de arquitectura: hacen cumplir las reglas de dependencia del documento rector.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');
const MODULOS = readdirSync(path.join(SRC, 'modules'));

function archivosJs(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) return archivosJs(p);
    return p.endsWith('.js') ? [p] : [];
  });
}

function importsDe(archivo) {
  const src = readFileSync(archivo, 'utf8');
  const re = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...src.matchAll(re)].map((m) => m[1] ?? m[2]);
}

const rel = (p) => path.relative(SRC, p);

describe('Regla de oro hexagonal: el dominio es código puro', () => {
  const dominios = [path.join(SRC, 'shared/domain'), ...MODULOS.map((m) => path.join(SRC, 'modules', m, 'domain'))];
  const archivos = dominios.flatMap(archivosJs);

  it('existen archivos de dominio que verificar', () => {
    expect(archivos.length).toBeGreaterThan(5);
  });

  it.each(archivos.map((a) => [rel(a), a]))('%s solo importa dominio', (_n, archivo) => {
    for (const imp of importsDe(archivo)) {
      // Sin paquetes externos (fastify, pg, zod...) ni módulos de Node.
      expect(imp, `${rel(archivo)} importa "${imp}"`).toMatch(/^\./);
      const destino = rel(path.resolve(path.dirname(archivo), imp));
      expect(destino, `${rel(archivo)} -> ${destino}`).toMatch(/^(shared\/domain\/|modules\/[^/]+\/domain\/)/);
      // El dominio de un módulo no depende del dominio de otro módulo.
      const propio = rel(archivo).match(/^modules\/([^/]+)/)?.[1];
      const ajeno = destino.match(/^modules\/([^/]+)/)?.[1];
      if (propio && ajeno) expect(ajeno).toBe(propio);
    }
  });
});

describe('Aislamiento entre módulos', () => {
  const archivos = MODULOS.flatMap((m) => archivosJs(path.join(SRC, 'modules', m)).map((a) => [m, a]));

  it.each(archivos.map(([m, a]) => [rel(a), m, a]))('%s no importa internos de otros módulos', (_n, modulo, archivo) => {
    for (const imp of importsDe(archivo).filter((i) => i.startsWith('.'))) {
      const destino = rel(path.resolve(path.dirname(archivo), imp));
      const otro = destino.match(/^modules\/([^/]+)/)?.[1];
      if (otro) expect(otro, `${rel(archivo)} -> ${destino}`).toBe(modulo);
    }
  });

  it('la capa de aplicación no depende de infraestructura', () => {
    for (const m of MODULOS) {
      for (const archivo of archivosJs(path.join(SRC, 'modules', m, 'application'))) {
        for (const imp of importsDe(archivo)) {
          expect(imp, rel(archivo)).not.toMatch(/\/infra\/|^fastify|^pg$|shared\/db\//);
        }
      }
    }
  });
});

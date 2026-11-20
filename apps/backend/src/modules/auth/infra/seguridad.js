// Adaptadores de seguridad: hash de contraseñas (scrypt) y tokens de sesión.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);

/**
 * Hash de contraseñas con scrypt (resistente a fuerza bruta por GPU), sal
 * aleatoria por contraseña y comparación en tiempo constante.
 * Formato: `scrypt$N$r$p$salBase64$hashBase64`.
 */
export function crearHasherScrypt({ N = 16384, r = 8, p = 1, longitud = 64 } = {}) {
  return {
    async hash(password) {
      const sal = randomBytes(16);
      const derivada = await scrypt(password, sal, longitud, { N, r, p });
      return ['scrypt', N, r, p, sal.toString('base64'), derivada.toString('base64')].join('$');
    },
    async verificar(password, almacenado) {
      const partes = String(almacenado).split('$');
      if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
      const [, n, rr, pp, salB64, hashB64] = partes;
      const esperado = Buffer.from(hashB64, 'base64');
      const derivada = await scrypt(password, Buffer.from(salB64, 'base64'), esperado.length, {
        N: Number(n),
        r: Number(rr),
        p: Number(pp),
      });
      return derivada.length === esperado.length && timingSafeEqual(derivada, esperado);
    },
  };
}

/** Tokens de 256 bits para la cookie; en BD solo se guarda su SHA-256. */
export const tokensSesion = Object.freeze({
  generar: () => randomBytes(32).toString('base64url'),
  huella: (token) => createHash('sha256').update(token).digest('hex'),
});

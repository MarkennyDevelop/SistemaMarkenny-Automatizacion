// Agregado Cliente. Código de dominio puro.
import { DomainError } from '../../../shared/domain/errors.js';
import { aIso, congelarProfundo } from '../../../shared/domain/inmutable.js';

/**
 * Normaliza el RIF a `J-12345678-9` para que el mismo cliente no se registre
 * dos veces con distinta escritura. Respeta los guiones que escribió el
 * usuario; sin guiones, 9 dígitos se leen como 8 + dígito verificador (formato
 * del SENIAT).
 */
export function normalizarRif(rif) {
  const limpio = String(rif).toUpperCase().replace(/[\s.]/g, '');
  const m = /^([VJEGP])-?(\d{6,9})(?:-(\d))?$/.exec(limpio);
  if (!m) throw new DomainError('Formato de RIF inválido (J-12345678-9)', { codigo: 'REGLA_NEGOCIO' });
  let [, letra, numero, verificador] = m;
  if (!verificador && numero.length === 9) {
    verificador = numero.slice(8);
    numero = numero.slice(0, 8);
  }
  return verificador ? `${letra}-${numero}-${verificador}` : `${letra}-${numero}`;
}

export function crearCliente({ id, nombre, rif, contacto, telefono, email, ciudad, creadoPor, fecha }) {
  if (!nombre?.trim() || !contacto?.trim() || !telefono?.trim() || !email?.trim() || !ciudad?.trim()) {
    throw new DomainError('Faltan datos del cliente', { codigo: 'REGLA_NEGOCIO' });
  }
  return congelarProfundo({
    id,
    nombre: nombre.trim(),
    rif: normalizarRif(rif),
    contacto: contacto.trim(),
    telefono: telefono.trim(),
    email: email.trim().toLowerCase(),
    ciudad: ciudad.trim(),
    creadoPor: creadoPor ?? null,
    creadoEn: aIso(fecha),
  });
}

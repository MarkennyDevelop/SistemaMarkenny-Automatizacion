// Adaptadores de sistema para los puertos Clock e IdGenerator.
import { randomUUID } from 'node:crypto';

export const relojSistema = Object.freeze({ ahora: () => new Date() });

export const generadorUuid = Object.freeze({ generar: () => randomUUID() });

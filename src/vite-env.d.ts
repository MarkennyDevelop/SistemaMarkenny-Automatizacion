/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen del backend si no se usa el proxy de Vite (vacío = mismo origen). */
  readonly VITE_API_URL?: string;
}

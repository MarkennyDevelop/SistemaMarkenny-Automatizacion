/** `localStorage` en memoria para probar el mock persistente fuera del navegador. */
export function instalarLocalStorage() {
  const datos = new Map<string, string>();
  const almacen: Storage = {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (clave) => datos.get(clave) ?? null,
    key: (indice) => [...datos.keys()][indice] ?? null,
    removeItem: (clave) => void datos.delete(clave),
    setItem: (clave, valor) => void datos.set(clave, String(valor)),
  };
  Object.assign(globalThis, { window: { localStorage: almacen }, localStorage: almacen });
  return almacen;
}

# Auditoría del frontend — 2026-11-20

Revisión completa del frontend (rama `Frontend`) antes de integrarlo con el
backend Fastify + PostgreSQL + Zod. Objetivo: quitar bugs e inconsistencias sin
cambiar la lógica visual.

**Estado de partida:** `typecheck` y `build` ya pasaban sin errores. Todos los
problemas encontrados son de lógica, datos o contrato; ninguno lo detectaba el
compilador.

**Verificación final:** `npm run typecheck` y `npm run build` sin errores;
24 pruebas Vitest nuevas pasan (`npm test`); recorrido completo en Chromium con
zona horaria `America/Caracas` (roles, OT de papelería, cuatro fases, sellos) sin
errores ni avisos en consola.

---

## 1. Bugs corregidos

| # | Severidad | Hallazgo | Corrección |
|---|---|---|---|
| B1 | Alta | **La fecha de entrega se mostraba un día antes.** `new Date("2026-11-25")` se interpreta como medianoche UTC, que en Venezuela (UTC-4) es el 24. Afectaba listados, seguimiento, ficha de planta y el aviso "Entrega hoy/mañana". Además la fecha por defecto y el `min` del input usaban el día UTC: después de las 8 p. m. proponían el día siguiente. | `src/lib/fechas.ts`: fechas sin hora se leen como locales; las fichas envían ISO al mediodía local (`fechaEntregaIso`); `formatDate` y la tarjeta de planta usan `parseFecha`/`diasHasta`. |
| B2 | Alta | **Acabados con dos formatos distintos.** Papelería y gran formato enviaban identificadores (`numerado`, `ojales`) y planta veía "numerado, engrapado"; la ficha general enviaba nombres ("Numerado"). | `features/ventas/lib/ordenes.ts`: una sola traducción ficha → `NuevaOrdenTrabajo` para las tres páginas; los acabados siempre van con nombre. |
| B3 | Alta | **Las observaciones se ocultaban.** La ficha de planta y el seguimiento mostraban `descripcion \|\| observaciones`: si la orden tenía descripción, las observaciones del vendedor para el taller no se veían. La ficha general, además, mezclaba ambas en `descripcion`. | Se muestran las dos; la ficha general guarda `observaciones` en `especificaciones`. |
| B4 | Alta | **Nombre de fase distinto al backend:** el frontend usaba `EMPACADO` y el backend `EMPAQUETADO`. | Renombrado a `EMPAQUETADO`. `mock/db.ts` migra al leer las órdenes e historiales ya guardados en el navegador. |
| B5 | Media | **Salida de inventario sin control de stock.** Una salida mayor al stock se registraba igual, el stock quedaba en 0 en silencio y el movimiento auditado decía otra cantidad. | El mock rechaza el movimiento con "Stock insuficiente"; el diálogo lo avisa y desactiva el botón antes de enviar. |
| B6 | Media | **El rol no se validaba en el "servidor".** La documentación decía que `actualizarFaseOrden` exigía rol Producción o Admin, pero no lo comprobaba. Si faltaba la sesión, el hook firmaba como "Operario de planta" con rol `PRODUCCION`. | El mock exige rol Producción/Admin para cambiar fase y Vendedor/Admin para crear órdenes. Sin sesión no se firma nada: la operación falla. |
| B7 | Media | **"Notificación enviada al vendedor" antes de tiempo.** El aviso salía al pulsar, aunque el avance fallara después. | El aviso sale solo cuando el servidor confirma el avance. |
| B8 | Media | **Orden con cliente inexistente.** `crearOrden` aceptaba un `clienteId` desconocido y lo guardaba como "Cliente nuevo". | Se rechaza con "El cliente seleccionado no existe". |
| B9 | Media | **Auditoría con rol falso.** El primer evento de toda OT decía `rol: VENDEDOR` aunque la creara el administrador; la ficha general no registraba vendedor ("Sistema"). | El evento usa el usuario y rol reales de la sesión; las tres fichas envían el vendedor. |
| B10 | Media | **Contador de órdenes activas del cliente nunca cambiaba.** | Sube al crear una OT y baja al empaquetarla. |
| B11 | Media | **Fallo al usar la app por la IP de la red local** (`http://192.168…`, habilitado por `server.host: true`). `crypto.randomUUID` solo existe en HTTPS/localhost, así que crear clientes, órdenes o empleados lanzaba un error. | `nuevoId()` en `lib/utils.ts` con alternativa; la sal de contraseñas usa `crypto.getRandomValues`. |
| B12 | Media | **Despacho de sellos con tipo "Entrada".** Desde *Sellos y PT* el diálogo de despacho abría en "Entrada" y el aviso decía "Salida registrada… unidades despachadas" aunque se hubiera registrado una entrada. | El diálogo abre en "Salida / consumo" y el aviso refleja el tipo real. |
| B13 | Baja | **Envío bloqueado sin aviso visible** en papelería: con la numeración desactivada, un campo de numeración vacío seguía siendo obligatorio y su error quedaba oculto. | La numeración solo se exige si está activada. |
| B14 | Baja | **Se aceptaban fechas de entrega pasadas** (solo lo impedía el selector del navegador). | Validación Zod: "La fecha de entrega no puede ser anterior a hoy". |
| B15 | Baja | **El seguimiento del vendedor no se actualizaba solo:** los avances de planta no aparecían hasta recargar. | Refresco automático cada 30 s en el listado de órdenes de ventas. |
| B16 | Baja | **El login revelaba qué correos existen** ("Verifica tu correo" frente a "Verifica tu contraseña"). | Mensaje único: "Correo o contraseña incorrectos". |
| B17 | Baja | **El cotizador mostraba "NaN"** al vaciar un campo numérico mientras se escribe. | Los valores no numéricos cuentan como 0 en el cálculo. |

## 2. Robustez del tablero de producción (TanStack Query)

| Hallazgo | Corrección |
|---|---|
| Nada impedía pedir un segundo avance de una orden mientras el primero seguía pendiente. **En la prueba, el doble clic sobre "Marcar" con el código original no llegó a saltar la revisión**, así que esto es una protección preventiva, no un bug reproducido. | `useMutationState` lista las órdenes con avance pendiente: no aceptan otro, y sus botones y arrastre se desactivan. |
| Al terminar cada avance se refrescaba la lista aunque hubiera otro avance en curso, lo que podía pisar el estado optimista. | Solo refresca el último avance pendiente (`isMutating`). |
| La tarjeta optimista no actualizaba avance ni historial hasta el siguiente refresco. | Se reemplaza por la orden confirmada que devuelve el servidor. |
| El error de avance se mostraba con un `useEffect` sobre `mutation.error`. | Se muestra en el `onError` de cada avance. |

## 3. Arquitectura y limpieza

- **Importaciones entre features:** `dashboard` importaba rutas internas de
  `ventas/api` e `inventario/api`. Ahora usa sus `index.ts` (`ventasApi` e
  `inventarioApi` se exportan ahí). Los hooks importan su propia `api/` por ruta
  relativa.
- **Lógica fuera de las páginas:** la traducción de cada ficha al contrato vive
  en `features/ventas/lib/ordenes.ts` (pura, con pruebas). Las páginas quedan
  como contenedores y `aMilimetros` sale de un componente.
- **Lógica de stock duplicada:** `useRegistrarMovimiento` recalculaba el stock en
  la caché con su propia fórmula. Ahora solo invalida y el cálculo vive en una
  única función `stockTrasMovimiento` (`shared/domain.ts`).
- **Claves de caché:** `["auth", "hay-admin"]` estaba escrita a mano en dos
  páginas; ahora es `queryKeys.hayAdministrador`. Se quitó `queryKeys.sesion`
  (sin uso).
- **Código muerto eliminado:** `PlantaKanbanPage` (263 líneas, sin ruta),
  `OrdenCardEmptyHint`, `CotizadorHeaderIcon`, `PERMISOS`/`tienePermiso`,
  `OPERADORES`, un estado sin uso en `KanbanBoard` y `columnas` duplicado en
  `usePlantaBoard`.
- **Paleta:** las variantes `success` (verde) y `warning` (ámbar) de `Badge`
  estaban fuera de la paleta rojo/negro/blanco y sin uso; se quitaron.
- **Sin `any`, sin `@ts-ignore` y sin `console.log` olvidados.** El único
  `console.error` es el de `ErrorBoundary` y es intencional.
- **README:** las listas de "Arquitectura" de backend y frontend estaban
  intercambiadas; se corrigieron.

## 4. Verificación en navegador (Chromium, `America/Caracas`)

| Comprobación | Resultado |
|---|---|
| Primer arranque sin administrador | Redirige a `/setup-admin` |
| Login con correo inexistente | "Correo o contraseña incorrectos" |
| Vendedor en `/admin`, `/admin/empleados`, `/produccion`, `/inventario` y `/ventas/nueva-orden/otros` | Vuelve a `/ventas/dashboard` |
| Producción en `/ventas/dashboard` y `/admin` | Vuelve a `/produccion` |
| OT de papelería con entrega el 25 | Guardada como `…-25T16:00:00.000Z`; el seguimiento muestra el día 25 |
| Acabados en planta | "Numerado, Engrapado, Perforado" |
| Descripción y observaciones | Ambas visibles en seguimiento y en la ficha de planta |
| Cuatro fases | Historial `EN_PROCESO/VENDEDOR > EN_REVISION/PRODUCCION > FINALIZADO/PRODUCCION > EMPAQUETADO/PRODUCCION` |
| Despacho en *Sellos y PT* | Abre en "Salida / consumo"; con cantidad mayor al stock avisa y desactiva el botón |
| Consola del navegador | Sin errores ni avisos |

## 5. Pendientes que requieren decisión (no se cambiaron)

1. **¿El vendedor ve todas las órdenes o solo las suyas?** El dashboard del
   vendedor dice "Tus órdenes", pero muestra las de todos. Además el vendedor se
   identifica por **nombre**, no por id: al conectar el backend conviene guardar
   `vendedorId`.
2. **Retrabajo por calidad.** El backend permite volver de `EN_REVISION` a
   `EN_PROCESO` con motivo obligatorio (rechazo de QC); el frontend solo avanza.
   Hay que alinear ambos al construir la API.
3. **Entrega del producto terminado.** *Sellos y PT* muestra todas las órdenes
   `EMPAQUETADO` como "pendientes de entrega", pero no existe la acción de
   entregarlas, así que nunca salen de esa lista. El backend ya tiene entregas
   totales y parciales.
4. **Autenticación real.** Sigue siendo el mock en `localStorage`; se sustituye al
   conectar la API (cookies httpOnly), junto con `cargarCuentasDemo`.
5. El contador "Uptime 99,2 %" del panel "Taller en vivo" es un texto fijo.

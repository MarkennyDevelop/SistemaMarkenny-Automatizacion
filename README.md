# SistemaMarkenny-Automatizacion

Sistema de gestion de produccion e inventario para la empresa Markenny

## Indicaciones:

Automatizacion de Negocio.

1. Gestion de Ventas y Pedidos
2. Gestion de Inventario y Almacen
3. Gestion de Fases de la Produccion
4. Gestion Administrativa
5. Gestion de usuarios por roles
6. Gestion de Personal Empleado (No incluye nomina por los momentos)
7. 

## Rama `API`: contrato frontend ↔ backend

Esta rama contiene el contrato con el que se conectan el frontend (rama
`Frontend`) y el backend (rama `Backend`):

- `packages/contrato`: reglas compartidas, esquemas Zod y tabla de endpoints.
- `packages/cliente-http`: cliente HTTP tipado para el frontend.
- `docs/api/openapi.json`: especificación OpenAPI generada desde el contrato.

Detalle, reglas de negocio acordadas y cambios pendientes en
[`docs/api/README.md`](docs/api/README.md).


## Registro de reparaciones — 24/11/2026

Antes de tocar archivos se revisaron las tres ramas (`Frontend`, `Backend`,
`API`) y la rama `main`. El diagnóstico se ordenó en tres ejes; debajo de cada
hallazgo está lo que se corrigió y dónde.

### 1. Lógica de negocio

| Hallazgo | Corrección | Rama |
|---|---|---|
| Una orden FINALIZADO no podía volver a EN_PROCESO; solo había retrabajo desde EN_REVISION. | `TRANSICIONES.FINALIZADO = ['EMPAQUETADO', 'EN_PROCESO']`. `esRetrabajo()` y `requiereMotivo()` en el contrato: todo regreso a EN_PROCESO exige motivo (mín. 3 caracteres) y queda en `produccion_etapas_auditoria`. Al volver, `fechaFinalizado` se borra. | API, Backend |
| Autorización de cambio de fase solo en el frontend. | `ROLES_CAMBIO_FASE = ['PRODUCCION', 'ADMIN']` en el contrato; el endpoint `POST /ordenes/:id/transiciones` lo aplica en el servidor. Un VENDEDOR recibe **403** (probado por HTTP y desde el navegador). | API, Backend |
| El vendedor no tenía forma de pedir correcciones. | Nuevo `POST /ordenes/:id/notas` (todos los roles; el vendedor solo en sus órdenes, si no 404). Una nota puede marcar `solicitaRetrabajo`. Tabla `ordenes_notas` de solo inserción. Notificación a Producción y Administración. | API, Backend, Frontend |
| El inventario mezclaba maquinaria y consumibles ajenos (tintas, planchas CTP, "almacén"). | Solo materias primas: `PAPEL` (con tipo: Químico, Bond, Glasse, Bristol, Opalina, Fotográfico), `VINIL`, `LONA`, `SELLO`. Registrar otra cosa da 400 "El inventario solo registra materias primas". La migración 002 **archiva** (no borra) los materiales antiguos porque su kardex es inmutable. | API, Backend, Frontend |
| Productos terminados genéricos. | Tipos de Markenny: pliego de stickers, talonario, block, sello personalizado, pendón, vinil para rotulación. Al empaquetar, la orden ingresa al almacén con su tipo (`productoTerminadoDe`). | API, Backend, Frontend |
| La máquina era obligatoria aunque no está en el formato físico. | `maquina` opcional (`NULL` = "Sin asignar"); fichas de papelería y pendones ya no la piden. | API, Backend, Frontend |
| Semilla demo: entrada de 0 unidades para materiales agotados hacía fallar `seed:demo`. | Los agotados (Opalina, lona mesh) se crean con stock 0 sin movimiento. | Backend |
| Kardex con orden inestable (dos filas en el mismo milisegundo). | Columna `secuencia` (identity) en las tablas de auditoría. | Backend |

### 2. Interfaz

| Hallazgo | Corrección |
|---|---|
| La OT de papelería no coincidía con el formato impreso. | Ficha reescrita con los campos exactos: encabezado `MARKENNY, C.A.` RIF `J-50106023-1`, cliente con RIF y teléfono, nombre del documento, vendedor, fecha de aprobación, fecha finalizado, cantidad, tipo de trabajo `NE.` / `RM.` / `F.` / `Otro:`, `Talonario` / `Block`, `DOBLE CARA`, partes 1–4 / Otros, numeración `N°` con prefijo `00-`, perforación Sí/No + Horizontal/Vertical, engomado Arriba/Abajo/Der./Izq., laminado Brillante/Mate, color de tinta Pantone/Negro/Azul/Verde/Rojo/A Color/Otro, papel Químico/Bond/Glasse/Bristol/Opalina/Fotográfico/Otro con gramaje, tamaño 1/4 Carta, 1/2 Carta, Carta, Otro, observaciones, fecha de entrega y "Recibí conforme" en la vista previa. |
| Casillas preseleccionadas (numerado, engrapado, perforado; ojales, refuerzo) y máquina fija. | El formato arranca en blanco. Las casillas son botones accesibles (`role="radio"` / `role="checkbox"`, `aria-checked`) controlados por el formulario; las opcionales se pueden desmarcar. Componente `src/components/forms/OptionGroup.tsx`. |
| Pendones y stickers ofrecían 8 acabados. | Solo `Laminado mate`, `Laminado brillante`, `Corte con plotter` (también validado en el contrato). |
| Los papeles y sustratos salían de un catálogo fijo. | Hook `useDisponibilidad` (`GET /inventario/disponibilidad`, sin costos): los papeles, viniles y lonas sin existencia aparecen deshabilitados. |
| Clientes → "Crear OT" abría papelería, que ignoraba `?cliente=`. | Hook `useClientePreseleccionado` en las tres fichas (solo acepta ids que existen en la cartera), las pestañas conservan `?cliente=` y el selector `ClienteSelect` permite quitar o cambiar el cliente. |
| Kanban: no había forma de devolver una orden. | En la ficha de planta: botón "Devolver a En Proceso" (EN_REVISION o FINALIZADO), deshabilitado hasta escribir el motivo. Arrastrar hacia atrás sin motivo se rechaza con aviso. Lista de observaciones con las solicitudes de revisión resaltadas. |
| Seguimiento del vendedor sin canal hacia planta. | Tarjeta "Observaciones": registrar nota y, en revisión o finalizado, "Solicitar revisión (retrabajo)". El vendedor nunca cambia la fase. |
| RIF y razón social incorrectos (`J-40.512.336-7`, "Artes Gráficas Markenny"). | `EMPRESA` en el contrato (`MARKENNY, C.A.`, `J-50106023-1`) es la única fuente. |

Paleta Rojo/Negro/Blanco y arquitectura por features sin cambios; sin `console.log`.

### 3. Seguridad

- **SQL**: todas las consultas usan parámetros `$n` (revisado módulo por módulo).
- **Validación**: Zod en los bordes; el contrato valida entrada y respuesta de cada endpoint.
- **XSS**: React escapa el texto; no hay `dangerouslySetInnerHTML`. La API responde con CSP `default-src 'none'`.
- **CSRF**: cookie de sesión `httpOnly` + `SameSite=Lax`, y las peticiones que cambian datos con `Origin` ajeno (o `Sec-Fetch-Site: cross-site`) reciben **403 `ORIGEN_NO_PERMITIDO`**. Orígenes extra en `ORIGENES_PERMITIDOS`.
- **Escalada de privilegios**: roles por endpoint en el contrato y en el servidor; el frontend solo oculta. Vendedor → solo sus órdenes.
- **Cabeceras**: `@fastify/helmet` (CSP, `X-Content-Type-Options`, `frame-ancestors 'none'`, CORP same-origin, HSTS en producción).
- **Fuerza bruta**: `@fastify/rate-limit` global (`LIMITE_PETICIONES_MINUTO`, 600 por defecto) y estricto en login (10/15 min), setup-admin (5/15 min) y cambio de contraseña (10/15 min) → **429 `DEMASIADOS_INTENTOS`** con `retry-after`.
- **Errores**: 404/500 con el formato del contrato, sin rutas ni trazas; el log oculta cookies, `authorization` y contraseñas. `TRUST_PROXY` en `false` por defecto (evita falsear IP/host con `X-Forwarded-*`).

#### Las 9 vulnerabilidades de `npm audit` (frontend: 5 moderadas, 2 altas, 2 críticas)

| # | Paquete | Severidad | Ruta | Avisos | Uso | Corrección aplicada |
|---|---|---|---|---|---|---|
| 1 | `vitest` ≤4.1.10 | crítica | directa (dev) | GHSA-5xrq-8626-4rwp (lectura/ejecución de archivos con la UI de Vitest), GHSA-82fw-gwwq-j7x9 | Desarrollo | `vitest@^5.1.1` |
| 2 | `tinypool` ≤2.1.1 | crítica | `vitest > tinypool` | GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr (prototype pollution → RCE) | Desarrollo | sale con vitest 5 |
| 3 | `vite` ≤6.4.3 | alta | directa (dev) | GHSA-587h-7wmj-h5pm (alta), GHSA-4w7w-66w2-5vf9, GHSA-v6wh-96g9-6wx3, GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-rq7h-c2jc-7f22, GHSA-fx2h-pf6j-xcff, GHSA-9jrq-w75r-8gcw | Desarrollo (servidor dev) | `vite@^8.3.8` + `@vitejs/plugin-react@^6.3.0` |
| 4 | `zod` <4.6.6 | alta | directa | GHSA-mrhx-c7xc-m3w5 (agotamiento de memoria con colecciones grandes) | **Producción** (se empaqueta en el navegador y valida en el backend) | `zod@4.6.7` + `@hookform/resolvers@5.9.2` |
| 5 | `esbuild` ≤0.24.2 | moderada | `vite > esbuild` | GHSA-67mh-4wv8-2f99 (cualquier web puede leer el servidor de desarrollo) — es el *warning* de esbuild | Desarrollo | sale con Vite 8 (Rolldown) |
| 6 | `react-router` 6.0.0–7.17.0 | moderada | `react-router-dom > react-router` | GHSA-wrjc-x8rr-h8h6 (open redirect con `\`), GHSA-337j-9hxr-rhxg (solo SSR) | **Producción** | `react-router-dom@7.18.6` |
| 7 | `react-router-dom` 6.0.0-alpha.0–7.17.0 | moderada | directa | hereda las de `react-router` | **Producción** | `7.18.6` |
| 8 | `@vitest/mocker` ≤4.1.11 | moderada | `vitest > @vitest/mocker` | GHSA-82fw-gwwq-j7x9, GHSA-qxg6-89mg-rqv8 | Desarrollo | sale con vitest 5 |
| 9 | `vite-node` ≤2.2.0-beta.2 | moderada | `vitest > vite-node` | hereda las de `vite` | Desarrollo | sale con vitest 5 |

El backend tenía otras 9 (3 moderadas, 4 altas, 2 críticas): las mismas de
`vitest`/`tinypool`/`vite`/`esbuild`/`@vitest/mocker`/`vite-node`/`zod` y, en
producción, `fastify` ≤5.12.4 (GHSA-p68q-wchp-6fh7 omisión de autenticación por
URL malformada, GHSA-667r-xxjv-c9mm, GHSA-hwr6-493r-vm6h, GHSA-9q9j-q6p8-xq58,
GHSA-jx2c-rxcm-jvmq, GHSA-444r-cwp2-x5xf, GHSA-w2qp-rph6-63g4,
GHSA-4mh8-r7rc-xpvc, GHSA-mrq3-vjjr-p77c) y `find-my-way` ≤9.6.0
(GHSA-c96f-x56v-gq3h). Se actualizó a `fastify@5.12.8`, `@fastify/cookie@11`,
`@fastify/helmet@13`, `@fastify/rate-limit@11`, `fastify-plugin@5`.

**Cómo se remedió (sin `npm audit fix --force`)**: un paquete por vez, leyendo
el registro de cambios, corriendo typecheck, pruebas y build tras cada salto, y
regenerando el `package-lock.json`. Resultado: `npm audit` → **0
vulnerabilidades** en frontend y backend.

Riesgos de cada cambio y cómo se cubrieron:

- **Vite 8 / plugin-react 6**: exige Node `^20.19` o `>=22.12`. `manualChunks` pasó a función (Rolldown). Build verificado.
- **Vitest 5**: misma API de pruebas; 23 pruebas del frontend y 100 del backend en verde.
- **Zod 4**: `invalid_type_error`/`errorMap` → `{ error }`; `.extend()` sobre esquemas refinados → `.safeExtend()`. Los mensajes propios se mantienen en español.
- **React Router 7**: sin la prop `future` en `<BrowserRouter>`; rutas sin cambios.
- **Fastify 5**: plugins actualizados a sus versiones 5; probado con la batería HTTP completa.

### Base de datos (migración `002_retrabajo_notas_inventario.sql`)

Se aplica sobre datos existentes sin borrar auditoría: columnas `subtipo` y
`archivado` en `materiales`, conversión de categorías antiguas, `maquina`
opcional, `producto_terminado` en órdenes, `tipoPapeleria` → `tipoDocumento`
en las fichas, tabla `ordenes_notas` inmutable, nuevos tipos en almacén y
`secuencia` en las tablas de auditoría.

```bash
npm run migrate
```

### Variables de entorno nuevas (backend)

| Variable | Por defecto | Uso |
|---|---|---|
| `ORIGENES_PERMITIDOS` | vacío | Orígenes (separados por coma) que pueden hacer POST/PUT/DELETE además del propio host. |
| `TRUST_PROXY` | `false` | Ponerlo en `true` solo detrás de un proxy propio. |
| `LIMITE_PETICIONES_MINUTO` | `600` | Límite global por IP. |

### Verificación

- Contrato: 23 pruebas. Cliente HTTP: 9. Backend: 100 pruebas (memoria + PostgreSQL real). Frontend: typecheck, 23 pruebas y build.
- Navegador (Playwright contra backend + PostgreSQL con `seed:demo`): Crear OT desde Clientes precarga el cliente y se puede quitar; las pestañas conservan el cliente; el formato arranca sin casillas marcadas; Opalina y lona mesh (stock 0) aparecen deshabilitadas; se creó una OT de papelería y el seguimiento muestra los campos del formato; el vendedor registró una observación y recibió 403 al intentar cambiar la fase; pendones muestra solo los 3 acabados; Producción devolvió una orden FINALIZADO a EN_PROCESO con motivo; el inventario muestra solo Papeles, Viniles, Lonas y Sellos.

### Pendiente (requiere decisión del dueño del repositorio)

- La rama `main` tiene `node_modules/` versionado (commit `866d525`). Conviene quitarlo con `git rm -r --cached node_modules` y un `.gitignore`; no se tocó porque `main` no es una rama de trabajo de esta sesión.

## OT de papelería según el formato impreso — 24/11/2026 (segunda revisión)

Se comparó la ficha con la foto del formato impreso de MARKENNY, C.A. Lo que ya
coincidía se mantuvo (cliente y teléfono, vendedor, nombre del documento,
fechas de aprobación y finalizado, cantidad, NE./RM./F./Otro, Talonario/Block,
doble cara, laminado, tipos de papel, gramaje opcional, partes, observaciones y
fecha de entrega). Se corrigió:

| Antes | Ahora |
|---|---|
| Sin "Tarjetas de presentación". | Nuevo tipo de trabajo. No lleva talonario/block, partes, numeración ni engomado; ingresa al almacén como `TARJETAS_PRESENTACION`. |
| Horizontal/Vertical dependía de la perforación. | "Vista del trabajo" (`orientacion`) obligatoria e independiente; perforación es solo Sí/No. |
| Engomado disponible siempre. | Solo aparece con **Block**; se limpia al cambiar a Talonario. El contrato rechaza engomado fuera de blocks. |
| "Pantone" era una opción con referencia. | "Pantone" es el título de la columna: Negro, Azul, Verde, Rojo, A color, Otro (con nombre). |
| Tamaños sin tabloide. | 1/4 Cuarto de carta, 1/2 Media carta, Carta, **Tabloide**, Otro. |
| Una sola numeración. | **N° del encabezado** y **N° de control del pie de página** (prefijo `00-`), cada uno con su rango validado. |

Contrato: `TIPOS_DOCUMENTO` + `TARJETAS`, `TAMANOS_PAPELERIA` + `TABLOIDE`,
`COLORES_TINTA` sin `PANTONE`, `ORIENTACIONES`, campos `orientacion` y
`numeroControlPrefijo/Desde/Hasta`, `EMPRESA` con domicilio fiscal, correo,
teléfono e Instagram del formato.

Base de datos — migración `003_formato_impreso_papeleria.sql` (ejecutar
`npm run migrate`): convierte las órdenes existentes sin perder datos
(`perforacionOrientacion` → `orientacion`; color Pantone → "Otro: Pantone
<referencia>"; engomado en talonarios → se anota en las observaciones de la
orden) y agrega `TARJETAS_PRESENTACION` a los productos terminados. Probada
sobre órdenes guardadas en el formato anterior.

### Defectos de estilo corregidos (sin cambiar la estética)

- Las páginas con columna lateral (nueva orden, pendones, trabajo general,
  cotizador, seguimiento, panel de ventas) desbordaban **175 px** en móvil: la
  cuadrícula no tenía columna base y crecía con el contenido. Ahora `grid-cols-1`
  y `minmax(0, …)` en escritorio. Verificado: desborde 0 en las 13 rutas, en los
  tres roles, a 390 px.
- `OptionGroup`: la `<legend>` no era el primer hijo del `<fieldset>` (el grupo
  quedaba sin nombre accesible) y el `fieldset` no tenía `min-w-0`.
- Los campos de rango de 3 columnas pasaban a 2 en tablet porque `FormGrid`
  impone `sm:grid-cols-2`.
- "Horizontal" se partía a mitad de palabra; "Otros" se cortaba en Partes.
- Logo: ternarios con ramas idénticas y colores hex fijos → clases de la paleta
  (`fill-white`, `fill-markenny-red`).
- Notas de la orden: clases condicionales sin `cn` y `accent-[hsl(...)]` →
  `cn(...)` y `accent-primary`.
- Se verificó que todas las clases usadas existan en el CSS generado.

Verificación: contrato 26 pruebas, cliente HTTP 9, backend 100 (con
PostgreSQL), frontend 26 + typecheck + build, y recorrido en navegador contra
el backend real.

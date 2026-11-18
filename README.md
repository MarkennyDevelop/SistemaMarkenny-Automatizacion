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

# BACKEND:

1. Node.js LTS
2. Fastify como Framework web
3. JavaScript como Lenguaje Base
4. PostgreSQL para Base de Datos
5. Zod para Validaciones y Seguridad
6. Arquitectura Feature-Based Architecture

# FRONTEND:

1. React.js como Framework de la Interfaz
2. TypeScript como Lenguaje Base
3. Tailwind CSS como Framework de estilos
4. Vite como servidor y empaquetador
5. Shadcn UI para Sistema de componentes
6. Arquitectura Monolito Modular + Hexagonal + Event-Driven Interno

## Ramas del repositorio

| Rama | Contenido |
|---|---|
| `Backend` | Backend (`apps/backend`): Fastify + PostgreSQL + Zod |
| `Frontend` | Frontend (React + TypeScript + Vite + Tailwind + Shadcn UI) |

> **Nota de corrección de rama (2026-11-16):** la estructura base del backend se
> subió por error a esta rama `Frontend` (commit `17f2dcf`). Se trasladó a la rama
> `Backend` y se revirtió aquí, de modo que `Frontend` queda reservada al frontend.

---

## Frontend — Print MIS Markenny

Aplicación React 18 + TypeScript 5 + Vite 5 + Tailwind 3 + shadcn/ui (Radix).
Vive en la raíz del repositorio (`src/`), no en `apps/frontend`, para respetar la
estructura `src/features/*` acordada.

### Comandos

```bash
npm install       # instalar dependencias
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # typecheck + build de producción en dist/
npm run preview   # sirve el build (http://localhost:4173)
npm run typecheck # solo verificación de tipos
```

> En Windows con PowerShell restringido, usar `npm.cmd` en lugar de `npm`.

### Acceso, roles y primer arranque

El sistema arranca **sin usuarios sembrados**. Al abrir la aplicación por primera
vez, `/login` redirige a `/setup-admin`, donde se registra la cuenta maestra de
Administrador. Esa pantalla se bloquea de forma permanente en cuanto existe un
administrador activo.

| Rol | Alcance | Aterrizaje |
|---|---|---|
| Administrador | Control total: ventas, producción, inventario y empleados | `/admin` |
| Vendedor | Ventas, clientes, OT y seguimiento de sus trabajos | `/ventas/dashboard` |
| Producción | Taller, control de calidad, empaque y almacén | `/produccion` |

El alta de empleados es exclusiva del Administrador (`/admin/empleados`) y solo
permite crear cuentas **Vendedor** o **Producción**; no se puede crear un segundo
administrador desde la interfaz.

La identidad se persiste en `localStorage` (`markenny.print-mis.auth.v1`) con
SHA-256 + sal por usuario. Es un mock de desarrollo: al conectar Fastify se
sustituye por sesiones/cookies del backend.

**Credenciales de la demo validada:**

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@markenny.com` | `Markenny2026` |
| Vendedor | `valeria@markenny.com` | `Ventas2026` |
| Producción | `luis@markenny.com` | `Planta2026` |

Para reiniciar la demo por completo, borrar `markenny.print-mis.db.v1` y
`markenny.print-mis.auth.v1` del `localStorage` y recargar.

> **Importante:** las cuentas viven en el `localStorage` de **cada navegador**.
> Unas credenciales creadas en la sesión de pruebas de otro equipo o perfil no
> existen en el tuyo: al abrir la app verás `/setup-admin` o el login rechazará
> esos correos. Si eso ocurre, ejecuta `npm run dev` y pulsa **Cargar cuentas
> demo · solo desarrollo**, que aparece al pie de `/login` y `/setup-admin`.
> Ese botón instala las tres cuentas de la tabla anterior en tu navegador, cierra
> la sesión y recarga. No aparece en el build de producción (`npm run preview`).

### Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/login` | Inicio de sesión | Público (sin sesión) |
| `/setup-admin` | Registro único del administrador | Público, solo primer arranque |
| `/` | Redirección al inicio del rol | Autenticado |
| `/admin` | Dashboard general | Administrador |
| `/admin/empleados` | Alta y gestión de empleados | Administrador |
| `/ventas/dashboard` | Dashboard del vendedor | Administrador, Vendedor |
| `/ventas/ordenes` | Listado y filtros de órdenes de trabajo | Administrador, Vendedor |
| `/ventas/nueva-orden` | Ficha de papelería corporativa | Administrador, Vendedor |
| `/ventas/nueva-orden/pendones` | Ficha de gran formato | Administrador, Vendedor |
| `/ventas/nueva-orden/otros` | Ficha general de OT | Administrador |
| `/ventas/seguimiento` | Seguimiento de las 4 fases e historial | Administrador, Vendedor |
| `/ventas/cotizador` | Cotizador con motor de estimación en vivo | Administrador, Vendedor |
| `/ventas/clientes` | Cartera de clientes y saldos | Administrador, Vendedor |
| `/produccion` | Tablero Kanban de taller y QC | Administrador, Producción |
| `/planta` | Redirección a `/produccion` | Administrador, Producción |
| `/inventario` | Existencias, movimientos auditados y alertas | Administrador, Producción |
| `/inventario/sellos` | Sellos y producto terminado pendiente de entrega | Administrador, Producción |
| `*` | No encontrado | Autenticado |

### Estructura

```
src/
├─ app/                  # Providers, ErrorBoundary, NotFound
├─ components/
│  ├─ brand/             # MarkennyLogo (SVG propio)
│  ├─ forms/             # FormField, FormGrid (primitivas de formulario)
│  ├─ layout/            # AppShell, Sidebar, Topbar, PageHeader
│  ├─ theme/             # ThemeProvider (claro/oscuro) y ThemeToggle
│  └─ ui/                # Primitivas shadcn/Radix
├─ features/
│  ├─ auth/              # login, setup del admin, empleados y guardas por rol
│  ├─ dashboard/         # components · hooks
│  ├─ notificaciones/    # campana, hooks y marcado de leídas
│  ├─ planta-kanban/     # Kanban de producción, QC y detalle de OT
│  ├─ inventario/        # components · hooks · api · types (incluye sellos/PT)
│  └─ ventas/            # components · hooks · api · lib · types
│     └─ components/
│        ├─ cotizador/   # Compound Components del cotizador
│        ├─ papeleria/   # Compound Components de la ficha de papelería
│        ├─ gran-formato/ # Compound Components de la ficha de gran formato
│        ├─ orden-trabajo/ # Compound Components de la OT general
│        ├─ ordenes/     # Tabla de OT
│        └─ clientes/    # Tabla y diálogo de clientes
├─ lib/                  # utilidades (cn, formatCurrency, formatDate…)
└─ shared/               # domain.ts, catalogos.ts, fase-ui.ts, mock/db.ts, api/queryKeys.ts
```

Cada feature exporta su API pública desde `index.ts`; el resto de la app nunca
importa rutas internas de otra feature.

### Convenciones

- **Feature-based**: `components/` (presentación), `hooks/` (TanStack Query),
  `api/` (acceso a datos), `lib/` (reglas de negocio), `types/` (Zod + tipos).
- **Container / Presentational**: las páginas (`*Page.tsx`) orquestan datos y las
  vistas (`*View.tsx`, `*Table.tsx`, `KanbanBoard.tsx`) solo reciben props.
- **Compound Components**: `OrdenTrabajoForm.*`, `CotizadorForm.*`,
  `PapeleriaForm.*` y `GranFormatoForm.*` exponen `Root/Section/Summary/Submit` y
  comparten contexto vía `context.ts`.
- **Autenticación y permisos**: `RequireAuth`, `RequireRole` y `PublicOnly`
  protegen el árbol de rutas; `homeForRol` decide el aterrizaje y el `Sidebar`
  oculta los módulos fuera del alcance del rol.
- **Control de calidad secuencial**: `usePlantaBoard` y `mockDb.actualizarFaseOrden`
  solo permiten avanzar una fase (sin saltos ni retrocesos); cada cambio agrega un
  `EventoOrden` con usuario, rol, fecha y nota.
- **Notificaciones**: al marcar *Finalizado* o *Empaquetado* se genera una
  `Notificacion` para Vendedor y Administrador, visible en la campana del `Topbar`.
- **Estado del servidor**: TanStack Query con `queryKeys` centralizadas,
  mutaciones optimistas en Kanban e invalidación cruzada (una OT nueva refresca
  dashboard, listado y tablero).
- **Formularios**: React Hook Form + Zod (`zodResolver`), validación en vivo y
  resumen sticky con cálculos derivados.
- **Diseño**: paleta rojo/negro/blanco definida en `tailwind.config.ts` e
  `src/index.css`; tipografías locales con `@fontsource` (Inter + Barlow Condensed).
- **Datos mock**: `src/shared/mock/db.ts` simula una API con latencia y persiste en
  `localStorage` (`markenny.print-mis.db.v1`); la identidad vive aparte en
  `markenny.print-mis.auth.v1`. La capa `api/` ya está separada para sustituirla
  por los endpoints Fastify sin tocar los componentes.
- **Motor de cotización**: patrón Strategy por tipo de impresión (offset, digital,
  gran formato) en `features/ventas/lib/cotizador.ts`; también estima el monto de
  una OT.

### Registro de auditoría — Fase 2 y habilitación de acceso (2026-11-18)

Este apartado deja constancia del trabajo ejecutado después de la Fase 2 y de la
incidencia de acceso reportada por el usuario. Commits de referencia:
`f21295b` (Fase 2) y `b7a0758` (corrección de acceso).

#### Contexto y alcance

La Fase 2 entregó el frontend funcional completo: tres roles con guardas de ruta,
fichas de OT para papelería y gran formato, tablero Kanban con control de calidad
secuencial y auditado, notificaciones, inventario, sellos y cotizador. Todo se
validó contra la API mock persistente en `localStorage`, sin backend.

#### Síntoma reportado

El usuario indicó que no podía ingresar con las credenciales entregadas para
cada rol y preguntó si eran credenciales ficticias utilizadas únicamente en una
prueba de recorrido.

#### Diagnóstico y causa raíz

Las credenciales **no están codificadas en la aplicación**. Se crearon durante
la validación dentro del `localStorage` del navegador automatizado usado para las
pruebas (`markenny.print-mis.auth.v1`). Ese almacenamiento es privado por
navegador, perfil y equipo, por lo que en el navegador del usuario:

- no existían esas cuentas y `/login` redirigía a `/setup-admin` (arranque sin
  administrador), o
- si registraba su propio administrador, el login rechazaba los correos demo.

La lógica de autenticación —hash SHA-256 con sal por usuario, comparación y
redirección por rol— estaba correcta. El fallo era de **disponibilidad de los
datos de prueba**, no de validación de credenciales.

#### Decisión tomada

No sembrar usuarios en el flujo real, para preservar el requisito de registro
único del administrador. En su lugar se agregó un atajo **exclusivo de
desarrollo**: un botón que instala las tres cuentas demo en el navegador de quien
evalúa la interfaz. Se oculta en producción con `import.meta.env.DEV`.

| Archivo | Cambio y propósito |
|---|---|
| `src/features/auth/api/authApi.ts` | `cargarCuentasDemo()`: crea las tres cuentas con hash+sal, reemplaza el store de identidad y deja `sesion: null`. Falla fuera de `DEV`. |
| `src/features/auth/components/DemoAccountsButton.tsx` | Panel de desarrollo con confirmación, toast, recarga y creación condicional (`return null` en producción). |
| `src/features/auth/components/AuthLayout.tsx` | Integra el botón al pie de `/login` y `/setup-admin`. |
| `src/vite-env.d.ts` | Habilita los tipos de `import.meta.env` usados por el atajo. |
| `README.md` / `docs/ANALISIS-FRONTEND.md` | Documentación del comportamiento, registro y análisis para herederos. |

#### Reproducción controlada

1. `npm run dev` y abrir `http://localhost:5173`.
2. En `/login` o `/setup-admin`, pulsar **Cargar cuentas demo · solo desarrollo**
   y aceptar la confirmación (aviso de que se reemplazan las cuentas del navegador).
3. La página se recarga; entrar con cualquiera de las credenciales de la tabla
   anterior y comprobar el destino según el rol.
4. Para reiniciar, borrar `markenny.print-mis.auth.v1` y
   `markenny.print-mis.db.v1`, o repetir el paso 2.

#### Resultado de la validación

| Cuenta | Sesión iniciada | Redirección |
|---|---|---|
| `admin@markenny.com` | Kenny Hernández · ADMIN | `/admin` |
| `valeria@markenny.com` | Valeria Rondón · VENDEDOR | `/ventas/dashboard` |
| `luis@markenny.com` | Luis Pérez · PRODUCCION | `/produccion` |

Se comprobó además el cierre de sesión desde el menú de la cuenta, que las tres
cuentas quedaron activas con hash de 64 caracteres y `sesion: null` tras la carga,
y que `npm run typecheck` y `npm run build` terminan sin errores. Los servidores y
la pestaña de pruebas se cerraron al finalizar.

#### Impacto en requisitos

| Requisito | Estado tras el cambio |
|---|---|
| Registro único del administrador | Intacto: el botón es un atajo de desarrollo y no crea un segundo administrador desde la UI real. |
| Tres roles y dashboards por rol | Confirmado con las tres redirecciones. |
| Evaluación de interfaces por el usuario | Desbloqueada: el atajo funciona en el navegador del evaluador. |
| Seguridad | Sin cambios en producción: el botón no se compila y el mock sigue siendo solo de desarrollo. |

#### Riesgos, mitigaciones y rollback

| Riesgo | Mitigación |
|---|---|
| Cualquier visitante pudiera instalar cuentas | `import.meta.env.DEV` impide que el componente exista en `npm run build` / `npm run preview`. |
| Reemplazo accidental de cuentas propias | Confirmación explícita antes de sobreescribir el `localStorage`. |
| Contraseñas demo visibles en código | Aceptable solo en desarrollo; el backend deberá gestionar credenciales reales. |

Para revertir: eliminar el botón y `cargarCuentasDemo()`, revertir `b7a0758` y
borrar ambas claves del `localStorage`. El sistema vuelve al flujo puro
`/setup-admin` sin datos sembrados.

### Documentación de traspaso

El análisis técnico completo (decisiones, patrones, verificación, pendientes,
mapa de arquitectura para evaluación y registro detallado de esta incidencia)
está en [`docs/ANALISIS-FRONTEND.md`](docs/ANALISIS-FRONTEND.md), secciones 15 y 16.



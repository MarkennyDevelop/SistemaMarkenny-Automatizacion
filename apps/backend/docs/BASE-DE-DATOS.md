# Base de datos — Markenny Print MIS

PostgreSQL 13 o superior (probado con PostgreSQL 16).

| Archivo | Qué es |
|---|---|
| `src/shared/db/migrations/001_esquema_inicial.sql` | **Esquema oficial.** Lo aplica `npm run migrate` y queda registrado en `schema_migraciones`. |
| `src/shared/db/referencia/markenny-print.original.sql` | Tu archivo original (`markenny-print.sql`), conservado sin cambios como referencia. |

Para cambiar el esquema más adelante se crea un archivo nuevo
`002_….sql` en `migrations/`. Nunca se editan migraciones ya aplicadas.

## Origen y criterio

El esquema parte de `markenny-print.sql` (commit `4448545`). Se conservaron sus
tablas, columnas, índices GIN/B-Tree y nombres, y se ampliaron para cumplir el
contrato de la API (`packages/contrato`) y las reglas acordadas el 2026-11-20:
- cada vendedor ve solo sus órdenes;
- retrabajo de `EN_REVISION` a `EN_PROCESO` con motivo;
- entrega del pedido desde el almacén.

## Cambios respecto a `markenny-print.sql`

### Tablas originales

| Tabla | Cambio | Motivo |
|---|---|---|
| `roles` | Valores `ADMIN`, `VENDEDOR`, `PRODUCCION` (antes `ADMINISTRADOR`) con `CHECK` y carga inicial. | Mismos valores que el frontend y el contrato. |
| `usuarios` | `rol_id` obligatorio; se añaden `telefono`, `cargo`, `creado_por` y `ultimo_acceso`; el correo se guarda en minúsculas. | Los pide la pantalla de empleados. El correo en minúsculas evita cuentas duplicadas por mayúsculas. |
| `materiales` | `tipo` usa las categorías del frontend (`PAPEL`, `TINTAS`, `PLANCHAS`, `VINILOS`, `SELLOS`, `ALMACEN`). `unidad_medida` con catálogo. Se añaden `costo_unitario`, `ubicacion`, `proveedor`, `lote` y `version`. `CHECK stock_actual >= 0`. | Lo muestra el inventario. `version` es el bloqueo optimista (dos movimientos simultáneos no se pisan). El `CHECK` impide stock negativo incluso ante un error de código. |
| `stock_productos_pendientes` | `referencia_id` pasa a ser FK única a la orden. Se separan `cantidad_inicial` y `cantidad_en_stock`. `estado_entrega` toma `PENDIENTE`, `PARCIAL` o `ENTREGADO`. Se añaden `codigo_orden`, `cliente_id` y `cliente_nombre` como copia de la orden. | Permite entregas parciales. Una orden entra una sola vez al almacén. Inventario no consulta tablas de Producción. |
| `ordenes_trabajo` | `cliente_id` (FK a la nueva tabla `clientes`) y `vendedor_id` obligatorios. `tipo_trabajo` toma las categorías de las fichas (`PAPELERIA`, `GRAN_FORMATO`, `GENERAL`). Se añaden las columnas de la ficha (`producto`, `tecnologia`, `prioridad`, `maquina`, `operador`, `cantidad`, `sustrato`, `tintas`, `acabados`, `descripcion`). `estado_produccion` solo admite las 4 fases. Nuevo `estado_entrega`. Se añade `version`. `fecha_estimada_entrega` es obligatoria. | El frontend muestra y filtra estos campos. `ENTREGADO` deja de ser una fase y pasa a estado de entrega (decisión 4). `version` evita que dos operarios cambien la misma orden a la vez. Se conservan `cliente_nombre` y `cliente_telefono` como copia de la ficha impresa. |
| `produccion_etapas_auditoria` | Se añaden `usuario_nombre` y `usuario_rol` (copia en el momento del cambio). FK obligatorias. Triggers de **solo inserción** (bloquean `UPDATE`, `DELETE` y `TRUNCATE`). | La auditoría no cambia aunque luego se edite el usuario, y no se puede borrar. |

### Tablas nuevas

| Tabla | Para qué |
|---|---|
| `clientes` | Cartera de clientes con RIF único (normalizado a `J-12345678-9`). |
| `sesiones` | Sesiones por cookie. Se guarda el SHA-256 del token, nunca el token. Desactivar un usuario o cambiar su contraseña borra sus sesiones. |
| `ordenes_trabajo_contadores` | Numeración `OT-AAAA-NNNN` por año, atómica (dos ventas simultáneas no reciben el mismo número). |
| `movimientos_inventario` | Kardex: entradas, salidas, ajustes y reservas con responsable. Solo inserción. Índice único para que una orden no descuente dos veces el mismo material. |
| `entregas_productos` | Cada entrega (total o parcial) con quién la recibió y quién la registró. |
| `notificaciones`, `notificaciones_lecturas` | Campana del sistema: roles destinatarios, vendedor destinatario y lecturas por usuario. |

### Otros ajustes

- Se quitó `CREATE EXTENSION "uuid-ossp"`: `gen_random_uuid()` es nativa desde
  PostgreSQL 13 y la extensión no se usaba.
- Las fechas son `TIMESTAMPTZ` y los montos `NUMERIC(12,2)`, como en el original.

## Datos derivados

- **Órdenes activas de un cliente:** sus órdenes que aún no están `EMPAQUETADO`.
- **Saldo pendiente de un cliente:** suma de `monto_total` de sus órdenes que
  aún no están `ENTREGADO`. Es provisional: cuando exista un módulo de pagos,
  el saldo se calculará con los abonos.

## Diagrama

```
roles 1───* usuarios 1───* sesiones
               │
               ├──* clientes (creado_por)
               │
clientes 1───* ordenes_trabajo *───1 usuarios (vendedor)
                    │
                    ├──* produccion_etapas_auditoria *───1 usuarios
                    ├──* movimientos_inventario *───1 materiales
                    ├──1 stock_productos_pendientes 1───* entregas_productos
                    └──* notificaciones 1───* notificaciones_lecturas
```

## Uso

```bash
# 1. Crear base y usuario (una vez)
createuser -P markenny
createdb -O markenny markenny_mis

# 2. Aplicar migraciones
DATABASE_URL=postgres://markenny:CLAVE@localhost:5432/markenny_mis npm run migrate
```

En Windows (PowerShell) se define la variable en el archivo `.env` o con
`$env:DATABASE_URL="..."` antes de `npm run migrate`.

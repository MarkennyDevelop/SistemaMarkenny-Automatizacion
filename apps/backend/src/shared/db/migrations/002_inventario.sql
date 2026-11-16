-- Módulo de Inventario: materias primas, movimientos y stock de productos terminados.

CREATE TABLE inventario_materiales (
  id              UUID          PRIMARY KEY,
  codigo          VARCHAR(40)   NOT NULL UNIQUE,
  nombre          VARCHAR(200)  NOT NULL,
  categoria       VARCHAR(20)   NOT NULL
                  CHECK (categoria IN ('PAPEL', 'TINTA', 'PLANCHA', 'SUSTRATO', 'INSUMO_SELLO', 'OTRO')),
  unidad          VARCHAR(20)   NOT NULL,
  stock_actual    NUMERIC(14,4) NOT NULL CHECK (stock_actual >= 0),
  stock_minimo    NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  version         INTEGER       NOT NULL CHECK (version > 0),
  actualizado_en  TIMESTAMPTZ   NOT NULL
);

CREATE TABLE inventario_movimientos (
  id                UUID          PRIMARY KEY,
  material_id       UUID          NOT NULL REFERENCES inventario_materiales (id),
  tipo              VARCHAR(10)   NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  cantidad          NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  stock_resultante  NUMERIC(14,4) NOT NULL,
  referencia_tipo   VARCHAR(30)   NULL,
  referencia_id     VARCHAR(100)  NULL,
  usuario_id        VARCHAR(100)  NOT NULL,
  usuario           JSONB         NOT NULL,
  fecha             TIMESTAMPTZ   NOT NULL
);

CREATE INDEX idx_inventario_movimientos_material ON inventario_movimientos (material_id, fecha DESC);
CREATE INDEX idx_inventario_movimientos_referencia ON inventario_movimientos (referencia_tipo, referencia_id);

-- Idempotencia: una orden de producción solo descuenta cada material una vez.
CREATE UNIQUE INDEX uq_inventario_salida_por_orden
  ON inventario_movimientos (material_id, referencia_id)
  WHERE tipo = 'SALIDA' AND referencia_tipo = 'ORDEN_PRODUCCION';

-- Stock específico: sellos y productos terminados pendientes de entrega.
CREATE TABLE inventario_productos_terminados (
  id                    UUID          PRIMARY KEY,
  orden_id              UUID          NOT NULL UNIQUE,
  codigo_orden          VARCHAR(20)   NOT NULL,
  pedido_id             UUID          NULL,
  cliente_id            UUID          NOT NULL,
  tipo_producto         VARCHAR(20)   NOT NULL CHECK (tipo_producto IN ('IMPRESO', 'SELLO')),
  descripcion           TEXT          NOT NULL,
  especificacion_sello  JSONB         NULL,
  ubicacion             VARCHAR(60)   NULL,
  cantidad              INTEGER       NOT NULL CHECK (cantidad > 0),
  cantidad_entregada    INTEGER       NOT NULL DEFAULT 0 CHECK (cantidad_entregada >= 0),
  estado                VARCHAR(20)   NOT NULL
                        CHECK (estado IN ('PENDIENTE_ENTREGA', 'ENTREGA_PARCIAL', 'ENTREGADO')),
  ingresado_por         JSONB         NOT NULL,
  ingresado_en          TIMESTAMPTZ   NOT NULL,
  entregas              JSONB         NOT NULL DEFAULT '[]'::jsonb,
  version               INTEGER       NOT NULL CHECK (version > 0),
  CHECK (cantidad_entregada <= cantidad),
  CHECK (tipo_producto <> 'SELLO' OR especificacion_sello IS NOT NULL)
);

CREATE INDEX idx_inventario_pt_pendientes
  ON inventario_productos_terminados (tipo_producto, cliente_id)
  WHERE estado <> 'ENTREGADO';

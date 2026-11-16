-- Módulo de Producción: órdenes y auditoría de transiciones de estado.

CREATE SEQUENCE IF NOT EXISTS produccion_codigo_orden_seq;

CREATE TABLE produccion_ordenes (
  id                   UUID PRIMARY KEY,
  codigo               VARCHAR(20)  NOT NULL UNIQUE,
  pedido_id            UUID         NULL,
  cliente_id           UUID         NOT NULL,
  tipo_producto        VARCHAR(20)  NOT NULL CHECK (tipo_producto IN ('IMPRESO', 'SELLO')),
  descripcion          TEXT         NOT NULL,
  cantidad             INTEGER      NOT NULL CHECK (cantidad > 0),
  materiales           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  especificacion_sello JSONB        NULL,
  estado               VARCHAR(30)  NOT NULL
                       CHECK (estado IN ('EN_PROCESO', 'EN_REVISION', 'FINALIZADO', 'EMPAQUETADO')),
  version              INTEGER      NOT NULL CHECK (version > 0),
  creada_en            TIMESTAMPTZ  NOT NULL,
  actualizada_en       TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_produccion_ordenes_estado ON produccion_ordenes (estado);
CREATE INDEX idx_produccion_ordenes_cliente ON produccion_ordenes (cliente_id);

-- Bitácora de auditoría: append-only (qué usuario, cuándo, de qué estado a cuál).
CREATE TABLE produccion_auditoria_transiciones (
  orden_id    UUID         NOT NULL REFERENCES produccion_ordenes (id),
  secuencia   INTEGER      NOT NULL CHECK (secuencia > 0),
  desde       VARCHAR(30)  NULL,
  hacia       VARCHAR(30)  NOT NULL,
  usuario_id  VARCHAR(100) NOT NULL,
  usuario     JSONB        NOT NULL,
  fecha       TIMESTAMPTZ  NOT NULL,
  motivo      TEXT         NULL,
  PRIMARY KEY (orden_id, secuencia)
);

CREATE INDEX idx_produccion_auditoria_usuario ON produccion_auditoria_transiciones (usuario_id, fecha);

CREATE OR REPLACE FUNCTION produccion_auditoria_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La auditoría de transiciones es de solo inserción';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_produccion_auditoria_inmutable
  BEFORE UPDATE OR DELETE ON produccion_auditoria_transiciones
  FOR EACH ROW EXECUTE FUNCTION produccion_auditoria_inmutable();

-- TRUNCATE no dispara triggers por fila: se bloquea con un trigger por sentencia.
CREATE TRIGGER trg_produccion_auditoria_no_truncate
  BEFORE TRUNCATE ON produccion_auditoria_transiciones
  FOR EACH STATEMENT EXECUTE FUNCTION produccion_auditoria_inmutable();

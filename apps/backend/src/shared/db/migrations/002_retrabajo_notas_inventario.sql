-- =====================================================================
-- 002 — Retrabajo desde FINALIZADO, notas de orden, inventario solo de
--       materias primas y formato físico de la OT de papelería (2026-11-24)
--
-- Se aplica sobre bases que ya tienen datos: convierte lo existente en lugar
-- de borrarlo. Nada de la auditoría se elimina.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Inventario: solo materias primas (papel con su tipo, vinil, lona, sello)
-- ---------------------------------------------------------------------
ALTER TABLE materiales ADD COLUMN subtipo VARCHAR(20);
-- Materiales de categorías que ya no existen (tintas, planchas CTP, "almacén"):
-- se archivan en lugar de borrarse porque su kardex es de solo inserción.
ALTER TABLE materiales ADD COLUMN archivado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE materiales DROP CONSTRAINT materiales_tipo_check;
ALTER TABLE materiales DROP CONSTRAINT materiales_unidad_medida_check;

UPDATE materiales SET tipo = 'SELLO' WHERE tipo = 'SELLOS';
UPDATE materiales SET tipo = CASE WHEN nombre ILIKE '%lona%' THEN 'LONA' ELSE 'VINIL' END WHERE tipo = 'VINILOS';
UPDATE materiales SET archivado = TRUE WHERE tipo IN ('TINTAS', 'PLANCHAS', 'ALMACEN');
UPDATE materiales SET subtipo = CASE
    WHEN nombre ILIKE '%quím%' OR nombre ILIKE '%quim%' THEN 'QUIMICO'
    WHEN nombre ILIKE '%glas%' OR nombre ILIKE '%couch%' THEN 'GLASSE'
    WHEN nombre ILIKE '%bristol%' OR nombre ILIKE '%cartulina%' THEN 'BRISTOL'
    WHEN nombre ILIKE '%opalina%' THEN 'OPALINA'
    WHEN nombre ILIKE '%fotogr%' THEN 'FOTOGRAFICO'
    ELSE 'BOND'
  END
  WHERE tipo = 'PAPEL';

ALTER TABLE materiales ADD CONSTRAINT materiales_tipo_check
    CHECK (archivado OR tipo IN ('PAPEL', 'VINIL', 'LONA', 'SELLO'));
ALTER TABLE materiales ADD CONSTRAINT materiales_subtipo_check
    CHECK (archivado
           OR (tipo = 'PAPEL' AND subtipo IN ('QUIMICO', 'BOND', 'GLASSE', 'BRISTOL', 'OPALINA', 'FOTOGRAFICO'))
           OR (tipo <> 'PAPEL' AND subtipo IS NULL));
ALTER TABLE materiales ADD CONSTRAINT materiales_unidad_medida_check
    CHECK (archivado OR unidad_medida IN ('resma', 'pliego', 'unidad', 'rollo', 'metro', 'caja'));

CREATE INDEX idx_materiales_activos ON materiales (tipo) WHERE NOT archivado;

-- ---------------------------------------------------------------------
-- 2. Órdenes de trabajo
-- ---------------------------------------------------------------------
-- La máquina es una asignación opcional de taller: no figura en el formato
-- físico de papelería.
ALTER TABLE ordenes_trabajo ALTER COLUMN maquina DROP NOT NULL;

-- Producto terminado que la orden ingresa al almacén al empaquetar.
ALTER TABLE ordenes_trabajo ADD COLUMN producto_terminado VARCHAR(30);
UPDATE ordenes_trabajo SET producto_terminado = CASE
    WHEN tipo_trabajo = 'GRAN_FORMATO' AND especificaciones->>'tipoGranFormato' = 'STICKER' THEN 'PLIEGO_STICKERS'
    WHEN tipo_trabajo = 'GRAN_FORMATO' AND especificaciones->>'tipoGranFormato' IN ('PENDON', 'LONA') THEN 'PENDON'
    WHEN tipo_trabajo = 'GRAN_FORMATO' THEN 'VINIL_ROTULACION'
    ELSE 'TALONARIO'
  END;
ALTER TABLE ordenes_trabajo ALTER COLUMN producto_terminado SET NOT NULL;
ALTER TABLE ordenes_trabajo ADD CONSTRAINT ordenes_trabajo_producto_terminado_check
    CHECK (producto_terminado IN ('PLIEGO_STICKERS', 'TALONARIO', 'BLOCK', 'SELLO_PERSONALIZADO', 'PENDON', 'VINIL_ROTULACION'));

-- Fichas de papelería anteriores: "tipoPapeleria" pasa a "tipoDocumento" del
-- formato físico (F. factura, RM. récipe, NE. nota de entrega, Otro).
UPDATE ordenes_trabajo
   SET especificaciones = (especificaciones - 'tipoPapeleria')
       || CASE especificaciones->>'tipoPapeleria'
            WHEN 'FACTURA' THEN '{"tipoDocumento": "F"}'::jsonb
            WHEN 'RECIPE' THEN '{"tipoDocumento": "RM"}'::jsonb
            WHEN 'NOTA' THEN '{"tipoDocumento": "NE"}'::jsonb
            WHEN 'TALONARIO' THEN '{"formato": "TALONARIO"}'::jsonb
            ELSE jsonb_build_object('tipoDocumento', 'OTRO', 'tipoDocumentoOtro', initcap(lower(especificaciones->>'tipoPapeleria')))
          END
 WHERE especificaciones ? 'tipoPapeleria';

-- ---------------------------------------------------------------------
-- 3. Notas de la orden (observaciones y solicitudes de revisión)
-- ---------------------------------------------------------------------
CREATE TABLE ordenes_notas (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id           UUID NOT NULL REFERENCES ordenes_trabajo (id) ON DELETE RESTRICT,
    mensaje            VARCHAR(500) NOT NULL,
    solicita_retrabajo BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id         UUID NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    usuario_nombre     VARCHAR(150) NOT NULL,
    usuario_rol        VARCHAR(20) NOT NULL,
    registrado_en      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ordenes_notas_orden ON ordenes_notas (orden_id, registrado_en);

CREATE TRIGGER trg_ordenes_notas_inmutable
    BEFORE UPDATE OR DELETE ON ordenes_notas
    FOR EACH ROW EXECUTE FUNCTION auditoria_solo_insercion();
CREATE TRIGGER trg_ordenes_notas_sin_truncate
    BEFORE TRUNCATE ON ordenes_notas
    FOR EACH STATEMENT EXECUTE FUNCTION auditoria_solo_insercion();

-- ---------------------------------------------------------------------
-- 4. Almacén: productos terminados de Markenny
-- ---------------------------------------------------------------------
ALTER TABLE stock_productos_pendientes DROP CONSTRAINT stock_productos_pendientes_tipo_producto_check;
UPDATE stock_productos_pendientes p
   SET tipo_producto = CASE
       WHEN p.tipo_producto = 'SELLO' THEN 'SELLO_PERSONALIZADO'
       ELSE COALESCE((SELECT o.producto_terminado FROM ordenes_trabajo o WHERE o.id = p.referencia_id), 'TALONARIO')
     END
 WHERE p.tipo_producto IN ('SELLO', 'PRODUCTO_TERMINADO');
ALTER TABLE stock_productos_pendientes ADD CONSTRAINT stock_productos_pendientes_tipo_producto_check
    CHECK (tipo_producto IN ('PLIEGO_STICKERS', 'TALONARIO', 'BLOCK', 'SELLO_PERSONALIZADO', 'PENDON', 'VINIL_ROTULACION'));

-- ---------------------------------------------------------------------
-- 5. Orden estable en los registros de auditoría
-- ---------------------------------------------------------------------
-- Dos registros en el mismo milisegundo se desempataban por un UUID
-- aleatorio: el kardex podía mostrar una entrada después de su salida.
-- Una secuencia creciente da el orden real de inserción.
ALTER TABLE movimientos_inventario ADD COLUMN secuencia BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE produccion_etapas_auditoria ADD COLUMN secuencia BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE ordenes_notas ADD COLUMN secuencia BIGINT GENERATED ALWAYS AS IDENTITY;
ALTER TABLE entregas_productos ADD COLUMN secuencia BIGINT GENERATED ALWAYS AS IDENTITY;

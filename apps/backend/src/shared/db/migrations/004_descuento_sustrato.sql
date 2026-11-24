-- =====================================================================
-- 004 — Descuento automático del sustrato en órdenes de gran formato
--       (2026-11-24)
--
--  - Cantidades de stock con 3 decimales: una orden pequeña consume
--    fracciones de rollo (0,3 m² de un rollo de 61 m² = 0,005 rollo).
--  - Rendimiento (m² por unidad de stock) y merma % por material.
--  - La orden guarda qué material usó y cuánto se descontó.
-- =====================================================================

-- 1. Más precisión en stock y movimientos (ALTER TYPE no dispara los
--    triggers de solo inserción: no modifica filas, solo su tipo).
ALTER TABLE materiales ALTER COLUMN stock_actual TYPE NUMERIC(14, 3);
ALTER TABLE materiales ALTER COLUMN stock_minimo TYPE NUMERIC(14, 3);
ALTER TABLE movimientos_inventario ALTER COLUMN cantidad TYPE NUMERIC(14, 3);
ALTER TABLE movimientos_inventario ALTER COLUMN stock_resultante TYPE NUMERIC(14, 3);

-- 2. Rendimiento y merma (solo viniles y lonas se consumen por superficie)
ALTER TABLE materiales ADD COLUMN rendimiento NUMERIC(10, 3)
    CHECK (rendimiento IS NULL OR rendimiento > 0);
ALTER TABLE materiales ADD COLUMN merma_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (merma_porcentaje BETWEEN 0 AND 100);
ALTER TABLE materiales ADD CONSTRAINT materiales_rendimiento_superficie_check
    CHECK (rendimiento IS NULL OR archivado OR tipo IN ('VINIL', 'LONA'));

-- 3. Sustrato de la orden y cantidad descontada
ALTER TABLE ordenes_trabajo ADD COLUMN material_id UUID REFERENCES materiales (id) ON DELETE RESTRICT;
ALTER TABLE ordenes_trabajo ADD COLUMN consumo_sustrato NUMERIC(14, 3)
    CHECK (consumo_sustrato IS NULL OR consumo_sustrato > 0);
ALTER TABLE ordenes_trabajo ADD CONSTRAINT ordenes_trabajo_consumo_con_material_check
    CHECK (consumo_sustrato IS NULL OR material_id IS NOT NULL);
CREATE INDEX idx_ordenes_trabajo_material ON ordenes_trabajo (material_id) WHERE material_id IS NOT NULL;

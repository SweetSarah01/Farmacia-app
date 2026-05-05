-- AGREGAR CAMPOS FALTANTES A LA TABLA PHARMACIES
-- Ejecutar en Supabase SQL Editor

-- Agregar columnas que faltan
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS nit TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS ciudad TEXT DEFAULT 'Montería';
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS barrio TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS responsable_nombre TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente';
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS fecha_solicitud TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;

-- Verificar que se crearon
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pharmacies';
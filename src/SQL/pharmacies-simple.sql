-- Tabla pharmacies
CREATE TABLE IF NOT EXISTS pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nit TEXT,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL DEFAULT 'Montería',
  barrio TEXT,
  telefono TEXT NOT NULL,
  email TEXT,
  responsable_nombre TEXT,
  estado TEXT DEFAULT 'pendiente',
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pharmacy_id UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pharmacy_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barrio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS calificacion INTEGER;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comentario TEXT;

-- RLS
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Borrar políticas existentes si hay conflicto
DROP POLICY IF EXISTS "Anyone see approved pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Anyone see productos" ON productos;

-- Crear políticas
CREATE POLICY "Anyone see approved pharmacies" ON pharmacies FOR SELECT USING (estado = 'aprobado');
CREATE POLICY "Anyone see productos" ON productos FOR SELECT USING (true);
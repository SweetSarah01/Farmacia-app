-- Este SQL es para ejecutar SÓLO si ya tienes las tablas creadas
-- Ejecuta cada parte por separado

-- 1. Verificar si ya existe la tabla pharmacies
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'pharmacies'
);

-- 2. Si la tabla NO existe, crearla
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
  hora_apertura TIME DEFAULT '07:00',
  hora_cierre TIME DEFAULT '22:00',
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  logo TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  fecha_aprobacion TIMESTAMPTZ,
  aprobado_por UUID,
  motivo_rechazo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agregar columnas si no existen (ignora errores si ya existen)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS pharmacy_id UUID;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pharmacy_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barrio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS calificacion INTEGER;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comentario TEXT;

-- 4. Habilitar RLS (ignora si ya está habilitado)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas (ignora si ya existen)
CREATE POLICY IF NOT EXISTS "Anyone see approved pharmacies" ON pharmacies FOR SELECT USING (estado = 'aprobado');
CREATE POLICY IF NOT EXISTS "Anyone see productos" ON productos FOR SELECT USING (true);

-- 6. Verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pharmacies' 
ORDER BY ordinal_position;
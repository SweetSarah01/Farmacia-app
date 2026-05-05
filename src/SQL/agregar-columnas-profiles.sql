-- AGREGAR COLUMNAS FALTANTES A PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ciudad TEXT DEFAULT 'Montería';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS barrio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'cliente';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pharmacy_id UUID;

-- Ver estructura actualizada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
-- Agregar columnas faltantes a profiles
ALTER TABLE profiles ADD COLUMN username TEXT;
ALTER TABLE profiles ADD COLUMN telefono TEXT;
ALTER TABLE profiles ADD COLUMN direccion TEXT;

-- Agregar email si no existe
ALTER TABLE profiles ADD COLUMN email TEXT;

-- Verificar
SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles';
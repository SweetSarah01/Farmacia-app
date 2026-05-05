-- Ver estructura de profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Ver todos los perfiles
SELECT * FROM profiles LIMIT 10;
-- Ver todos los perfiles
SELECT * FROM profiles;

-- Ver estructura de la tabla
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';
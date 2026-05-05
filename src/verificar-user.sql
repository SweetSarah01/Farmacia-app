-- Buscar usuario por email en auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'legends334@hotmail.com';

-- Ver todos los perfiles
SELECT id, email, nombre, rol FROM profiles LIMIT 10;
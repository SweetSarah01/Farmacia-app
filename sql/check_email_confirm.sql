-- Ver si el usuario ya está confirmado
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'elemail@ejemplo.com';
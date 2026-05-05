-- Ver usuario por email
SELECT * FROM profiles WHERE email = 'elemail@quesea.com';

-- Eliminar usuario y todos sus datos relacionados
-- 1. Eliminar formulas del usuario
DELETE FROM formulas WHERE usuario_id = 'uuid-del-usuario';
-- 2. Eliminar pedidos del usuario
DELETE FROM pedidos WHERE cliente_id = 'uuid-del-usuario';
-- 3. Eliminar perfil
DELETE FROM profiles WHERE id = 'uuid-del-usuario';
-- 4. Eliminar usuario de auth (esto se hace desde Supabase Dashboard > Authentication > Users
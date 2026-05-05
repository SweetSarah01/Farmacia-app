-- Primero encuentra el UUID del usuario (reemplaza el email)
SELECT id FROM auth.users WHERE email = 'elemail@ejemplo.com';

-- Luego ejecuta esto para eliminar todos los datos relacionados (reemplaza el UUID)
-- DELETE FROM formulas WHERE usuario_id = 'uuid-aqui';
-- DELETE FROM pedido_productos WHERE pedido_id IN (SELECT id FROM pedidos WHERE cliente_id = 'uuid-aqui');
-- DELETE FROM pedidos WHERE cliente_id = 'uuid-aqui';
-- DELETE FROM pedidos WHERE domiciliario_id = 'uuid-aqui';
-- DELETE FROM pedidos WHERE farmaceutico_id = 'uuid-aqui';
-- DELETE FROM profiles WHERE id = 'uuid-aqui';
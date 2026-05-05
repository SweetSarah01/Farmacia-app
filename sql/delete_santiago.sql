-- Eliminar fórmulas
DELETE FROM formulas WHERE usuario_id = '2525d8a6-e4eb-481f-ac67-6d8f4934eed9';

-- Eliminar productos de pedidos del cliente
DELETE FROM pedido_productos WHERE pedido_id IN (SELECT id FROM pedidos WHERE cliente_id = '2525d8a6-e4eb-481f-ac67-6d8f4934eed9');

-- Eliminar pedidos del cliente
DELETE FROM pedidos WHERE cliente_id = '2525d8a6-e4eb-481f-ac67-6d8f4934eed9';

-- Eliminar si era domiciliario
DELETE FROM pedidos WHERE domiciliario_id = '2525d8a6-e4eb-481f-ac67-6d8f4934eed9';

-- Eliminar perfil
DELETE FROM profiles WHERE id = '2525d8a6-e4eb-481f-ac67-6d8f4934eed9';
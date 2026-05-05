-- Ver todos los usuarios con sus datos relacionados
SELECT 
  p.id, p.email, p.nombre, p.rol,
  (SELECT COUNT(*) FROM pedidos WHERE cliente_id = p.id) as pedidos_cliente,
  (SELECT COUNT(*) FROM formulas WHERE usuario_id = p.id) as formulas
FROM profiles p
ORDER BY p.created_at DESC;
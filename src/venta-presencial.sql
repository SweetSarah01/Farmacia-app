-- Agregar campos para venta presencial en tabla pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_nombre TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_telefono TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cliente_email TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_venta TEXT DEFAULT 'online';
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entregado BOOLEAN DEFAULT false;

-- Verificar que las columnas existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pedidos' 
AND column_name IN ('cliente_nombre', 'cliente_telefono', 'cliente_email', 'tipo_venta', 'entregado');
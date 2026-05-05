-- Ver políticas actuales
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Eliminar TODAS las políticas de todas las tablas públicas
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM information_schema.tables WHERE table_schema = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS ON %I', r.tablename);
  END LOOP;
END $$;

-- Deshabilitar RLS en todas las tablas públicas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE formulas DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas DISABLE ROW LEVEL SECURITY;

-- Verificar estado
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('profiles', 'formulas', 'productos', 'pedidos', 'pedido_productos', 'facturas');
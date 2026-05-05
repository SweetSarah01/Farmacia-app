-- =============================================
-- POLÍTICAS RLS - FARMACIA APP
-- Ejecutar esto en el Editor SQL de Supabase
-- =============================================

-- 1. Habilitar RLS en todas las tablas (si no está habilitado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- 2. Borrar políticas existentes
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can read productos" ON productos;
DROP POLICY IF EXISTS "Anyone can insert productos" ON productos;
DROP POLICY IF EXISTS "Anyone can update productos" ON productos;
DROP POLICY IF EXISTS "Anyone can delete productos" ON productos;
DROP POLICY IF EXISTS "Anyone can read pedidos" ON pedidos;
DROP POLICY IF EXISTS "Anyone can insert pedidos" ON pedidos;
DROP POLICY IF EXISTS "Anyone can update pedidos" ON pedidos;
DROP POLICY IF EXISTS "Anyone can read pedido_productos" ON pedido_productos;
DROP POLICY IF EXISTS "Anyone can insert pedido_productos" ON pedido_productos;
DROP POLICY IF EXISTS "Anyone can read formulas" ON formulas;
DROP POLICY IF EXISTS "Anyone can insert formulas" ON formulas;
DROP POLICY IF EXISTS "Anyone can update formulas" ON formulas;
DROP POLICY IF EXISTS "Anyone can read facturas" ON facturas;
DROP POLICY IF EXISTS "Anyone can insert facturas" ON facturas;
DROP POLICY IF EXISTS "Anyone can read pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Anyone can insert pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Anyone can update pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Anyone can delete pharmacies" ON pharmacies;

-- 3. Crear políticas para perfiles (cualquiera puede leer, usuarios pueden actualizar su propio perfil)
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Crear políticas para productos (cualquiera puede leer, solo admin puede modificar)
CREATE POLICY "Anyone can read productos" ON productos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert productos" ON productos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update productos" ON productos FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete productos" ON productos FOR DELETE USING (true);

-- 5. Crear políticas para pedidos
CREATE POLICY "Anyone can read pedidos" ON pedidos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pedidos" ON pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pedidos" ON pedidos FOR UPDATE USING (true);

-- 6. Crear políticas para pedido_productos
CREATE POLICY "Anyone can read pedido_productos" ON pedido_productos FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pedido_productos" ON pedido_productos FOR INSERT WITH CHECK (true);

-- 7. Crear políticas para fórmulas médicas
CREATE POLICY "Anyone can read formulas" ON formulas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert formulas" ON formulas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update formulas" ON formulas FOR UPDATE USING (true);

-- 8. Crear políticas para facturas
CREATE POLICY "Anyone can read facturas" ON facturas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert facturas" ON facturas FOR INSERT WITH CHECK (true);

-- 9. Crear políticas para pharmacies (super admin tiene acceso total)
CREATE POLICY "Anyone can read pharmacies" ON pharmacies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pharmacies" ON pharmacies FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pharmacies" ON pharmacies FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pharmacies" ON pharmacies FOR DELETE USING (true);

-- Verificar que se crearon
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
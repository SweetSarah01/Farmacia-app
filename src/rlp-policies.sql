-- =============================================
-- POLÍTICAS RLS COMPLETAS
-- =============================================

-- Ver pharmacies aprobadas (público)
DROP POLICY IF EXISTS "Anyone see approved pharmacies" ON pharmacies;
CREATE POLICY "Anyone see approved pharmacies" ON pharmacies FOR SELECT USING (estado = 'aprobado');

-- Insertar pharmacies (público - para registro)
DROP POLICY IF EXISTS "Anyone can insert pharmacies" ON pharmacies;
CREATE POLICY "Anyone can insert pharmacies" ON pharmacies FOR INSERT WITH CHECK (true);

-- Super Admin puede ver TODAS las pharmacies
CREATE POLICY "SuperAdmin can see all pharmacies" ON pharmacies 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'super_admin')
);

-- Super Admin puede actualizar pharmacies
CREATE POLICY "SuperAdmin can update pharmacies" ON pharmacies 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'super_admin')
);
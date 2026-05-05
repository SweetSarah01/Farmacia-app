-- Agregar pharmacy_id a profiles para asignar admin a una farmacia
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pharmacy_id UUID REFERENCES pharmacies(id);
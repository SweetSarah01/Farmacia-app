-- Actualizar productos existentes para marcar que requieren formula
update productos set formula_medica = true where nombre in (
'Amoxicilina 500mg',
'Clindamicina 300mg',
'Metronidazol 500mg',
'Azitromicina 500mg',
'Prednisona 50mg',
'Dexametasona 4mg',
'Tramadol 50mg',
'Ritalina 10mg',
'Diazepam 10mg',
'Clonazepam 2mg',
'Alprazolam 0.5mg'
);

-- Agregar productos nuevos (sin formula)
INSERT INTO productos (nombre, categoria, precio, stock, imagen, formula_medica)
VALUES ('Metformina 850mg', 'Diabetes', 12000, 80, '💊', false);

INSERT INTO productos (nombre, categoria, precio, stock, imagen, formula_medica)
VALUES ('Losartan 50mg', 'Cardiovascular', 12000, 75, '❤️', false);

INSERT INTO productos (nombre, categoria, precio, stock, imagen, formula_medica)
VALUES ('Atorvastatina 20mg', 'Cardiovascular', 18000, 60, '❤️', false);

INSERT INTO productos (nombre, categoria, precio, stock, imagen, formula_medica)
VALUES ('Omeprazol 20mg', 'Sistema digestivo', 9500, 70, '💊', false);

INSERT INTO productos (nombre, categoria, precio, stock, imagen, formula_medica)
VALUES ('Allegra 120mg', 'Alergias', 15000, 60, '💊', false);

INSERT INTO productos (nombre, categoria, precio, stock, imagen, formula_medica)
VALUES ('Omega 3', 'Suplementos', 25000, 35, '💊', false);
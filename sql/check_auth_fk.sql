-- Ver todas las tablas que referencian auth.users
SELECT
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.column_name = 'id'
AND ccu.table_name = 'auth.users';

-- Ver estructura de la tabla auth.users
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users';
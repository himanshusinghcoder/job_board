-- Check what tables exist in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check the structure of the employers table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'employers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the structure of the jobs table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the structure of the applications table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current RLS policies on applications table
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'applications';
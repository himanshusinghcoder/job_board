-- Check RLS policies for applications table
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'applications';

-- Check RLS policies for candidate_profiles table
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'candidate_profiles';

-- Test if current user can access applications
SELECT id, status, candidate_id FROM applications LIMIT 5;

-- Test if current user can access candidate_profiles
SELECT user_id, full_name, email FROM candidate_profiles LIMIT 5;
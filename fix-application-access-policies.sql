-- Fix RLS policies for applications table to allow proper access
-- This ensures both candidates and employers can access application details

-- First, check current policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'applications';

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view their own applications" ON applications;
DROP POLICY IF EXISTS "Candidates can view their own applications" ON applications;
DROP POLICY IF EXISTS "Employers can view applications to their jobs" ON applications;

-- Create policy for candidates to view their own applications
CREATE POLICY "Candidates can view their own applications" ON applications
FOR SELECT USING (candidate_id = auth.uid());

-- Create policy for employers to view applications to their jobs
CREATE POLICY "Employers can view applications to their jobs" ON applications
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM jobs j
        JOIN employers e ON e.id = j.employer_id
        WHERE j.id = applications.job_id 
        AND e.owner_id = auth.uid()
    )
);

-- Ensure candidate_profiles has proper RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Candidates can view their own profile" ON candidate_profiles;
DROP POLICY IF EXISTS "Employers can view candidate profiles for applications" ON candidate_profiles;

-- Allow candidates to view their own profile
CREATE POLICY "Candidates can view their own profile" ON candidate_profiles
FOR SELECT USING (user_id = auth.uid());

-- Allow employers to view candidate profiles for applications they can see
CREATE POLICY "Employers can view candidate profiles for applications" ON candidate_profiles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM applications a
        JOIN jobs j ON a.job_id = j.id
        JOIN employers e ON j.employer_id = e.id
        WHERE a.candidate_id = candidate_profiles.user_id
        AND e.owner_id = auth.uid()
    )
);

-- Verify the new policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('applications', 'candidate_profiles')
ORDER BY tablename, policyname;
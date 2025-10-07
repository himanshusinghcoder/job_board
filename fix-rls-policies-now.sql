-- MANUAL FIX: Run this in your Supabase SQL editor to fix the RLS policies immediately
-- This fixes the application update permission issue

-- First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'applications';

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Employers can update application status" ON applications;
DROP POLICY IF EXISTS "Employers can view applications to their jobs" ON applications;

-- Create simplified policy for viewing applications (just check employer ownership)
CREATE POLICY "Employers can view applications to their jobs" ON applications
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM jobs j
        JOIN employers e ON e.id = j.employer_id
        WHERE j.id = applications.job_id 
        AND e.owner_id = auth.uid()
    )
);

-- Create simplified policy for updating applications (just check employer ownership)  
CREATE POLICY "Employers can update application status" ON applications
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM jobs j
        JOIN employers e ON e.id = j.employer_id
        WHERE j.id = applications.job_id 
        AND e.owner_id = auth.uid()
    )
);

-- Verify the new policies were created
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'applications';

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'applications' 
AND policyname LIKE '%Employers can%';

-- Test query to see if you can now access applications
-- (Replace with your actual user ID if you know it)
SELECT 
    a.id,
    a.status,
    j.title as job_title,
    e.name as employer_name,
    e.owner_id,
    CASE 
        WHEN e.owner_id = auth.uid() THEN 'Owner'
        ELSE 'No Access'
    END as access_type
FROM applications a
JOIN jobs j ON a.job_id = j.id  
JOIN employers e ON j.employer_id = e.id
LIMIT 5;
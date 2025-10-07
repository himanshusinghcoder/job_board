-- ONE-TIME SETUP: Run this ONCE in your Supabase SQL editor
-- This sets up the RLS policies that will work for ALL employers (current and future)

-- Check current policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'applications';

-- Drop any existing problematic policies
DROP POLICY IF EXISTS "Employers can update application status" ON applications;
DROP POLICY IF EXISTS "Employers can view applications to their jobs" ON applications;

-- Create RLS policy that works for ANY employer who owns jobs
-- This will automatically work for all current and future employers
CREATE POLICY "Employers can view applications to their jobs" ON applications
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM jobs j
        JOIN employers e ON e.id = j.employer_id
        WHERE j.id = applications.job_id 
        AND e.owner_id = auth.uid()
    )
);

-- Create RLS policy for updating applications
-- This will automatically work for all current and future employers
CREATE POLICY "Employers can update application status" ON applications
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM jobs j
        JOIN employers e ON e.id = j.employer_id
        WHERE j.id = applications.job_id 
        AND e.owner_id = auth.uid()
    )
);

-- Verify the policies were created successfully
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'applications' 
AND policyname LIKE '%Employers can%';

-- Test that it works (this query should return applications you can access)
SELECT 
    a.id,
    a.status,
    j.title as job_title,
    e.name as employer_name,
    'Owner' as access_type
FROM applications a
JOIN jobs j ON a.job_id = j.id  
JOIN employers e ON j.employer_id = e.id
WHERE e.owner_id = auth.uid()
LIMIT 5;
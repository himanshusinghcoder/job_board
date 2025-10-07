-- Fix RLS policies for application updates
-- The current policy only checks employer_members, but employers can be owners too

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Employers can update application status" ON applications;

-- Create a new policy that checks both ownership and membership
CREATE POLICY "Employers can update application status" ON applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN employers e ON e.id = j.employer_id
            WHERE j.id = applications.job_id 
            AND (
                -- User is the owner of the employer
                e.owner_id = auth.uid()
                OR
                -- User is a member of the employer
                EXISTS (
                    SELECT 1 FROM employer_members em 
                    WHERE em.employer_id = e.id AND em.user_id = auth.uid()
                )
            )
        )
    );

-- Also fix the view policy to be consistent
DROP POLICY IF EXISTS "Employers can view applications to their jobs" ON applications;

CREATE POLICY "Employers can view applications to their jobs" ON applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN employers e ON e.id = j.employer_id
            WHERE j.id = applications.job_id 
            AND (
                -- User is the owner of the employer
                e.owner_id = auth.uid()
                OR
                -- User is a member of the employer
                EXISTS (
                    SELECT 1 FROM employer_members em 
                    WHERE em.employer_id = e.id AND em.user_id = auth.uid()
                )
            )
        )
    );
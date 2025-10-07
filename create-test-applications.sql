-- Script to create test applications for existing jobs
-- Run this to add sample applications if none exist

-- First, let's see what jobs and candidates exist
WITH job_candidates AS (
  SELECT 
    j.id as job_id,
    j.title as job_title,
    j.employer_id,
    p.id as candidate_id,
    p.full_name as candidate_name
  FROM jobs j
  CROSS JOIN profiles p
  WHERE j.status = 'published' 
    AND p.role = 'candidate'
    AND p.id != ALL(
      SELECT COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') 
      FROM employers
    )
  LIMIT 10
)
SELECT * FROM job_candidates;

-- Create some test applications (uncomment to run)
/*
INSERT INTO applications (job_id, candidate_id, status, cover_letter, created_at, updated_at)
SELECT 
  job_id,
  candidate_id,
  'pending',
  'I am very interested in this position and believe my skills would be a great fit.',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
FROM (
  SELECT DISTINCT
    j.id as job_id,
    p.id as candidate_id,
    ROW_NUMBER() OVER (PARTITION BY j.id ORDER BY RANDOM()) as rn
  FROM jobs j
  CROSS JOIN profiles p
  WHERE j.status = 'published' 
    AND p.role = 'candidate'
    AND p.id != ALL(
      SELECT COALESCE(owner_id, '00000000-0000-0000-0000-000000000000') 
      FROM employers
    )
) ranked
WHERE rn <= 2 -- Max 2 applications per job
ON CONFLICT (job_id, candidate_id) DO NOTHING;
*/
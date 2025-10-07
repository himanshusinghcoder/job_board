-- Debug script to check applications data
-- Run this in Supabase SQL editor

-- Check if there are any applications
SELECT 'Total applications' as label, COUNT(*) as count FROM applications;

-- Check applications for specific job
SELECT 'Applications for job 122612da-16cb-4c02-b286-81f57224ae7b' as label, COUNT(*) as count 
FROM applications 
WHERE job_id = '122612da-16cb-4c02-b286-81f57224ae7b';

-- Check if this job exists
SELECT 'Job exists' as label, COUNT(*) as count 
FROM jobs 
WHERE id = '122612da-16cb-4c02-b286-81f57224ae7b';

-- Check all jobs with their application counts
SELECT 
  j.id,
  j.title,
  j.employer_id,
  e.name as employer_name,
  COUNT(a.id) as application_count
FROM jobs j
LEFT JOIN applications a ON j.id = a.job_id
LEFT JOIN employers e ON j.employer_id = e.id
GROUP BY j.id, j.title, j.employer_id, e.name
ORDER BY application_count DESC;

-- Check if there are any employers
SELECT 'Total employers' as label, COUNT(*) as count FROM employers;

-- Check employer ownership
SELECT 
  e.id as employer_id,
  e.name as employer_name,
  e.owner_id,
  p.full_name as owner_name,
  p.role as owner_role
FROM employers e
LEFT JOIN profiles p ON e.owner_id = p.id;
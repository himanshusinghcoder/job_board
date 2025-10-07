-- Debug query to check applications count
-- Run this in Supabase SQL editor to verify applications exist

-- Check if there are any applications in the database
SELECT 
  'Total applications' as label,
  COUNT(*) as count 
FROM applications;

-- Check applications per job
SELECT 
  j.title,
  j.id as job_id,
  COUNT(a.id) as application_count
FROM jobs j
LEFT JOIN applications a ON j.id = a.job_id
GROUP BY j.id, j.title
ORDER BY application_count DESC;

-- Check if jobs have employer_id set correctly
SELECT 
  j.title,
  j.employer_id,
  e.name as employer_name
FROM jobs j
LEFT JOIN employers e ON j.employer_id = e.id;

-- Check the raw data structure
SELECT * FROM applications LIMIT 5;
SELECT * FROM jobs LIMIT 5;
SELECT * FROM employers LIMIT 5;
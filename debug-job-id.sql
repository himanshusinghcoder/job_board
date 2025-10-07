-- Debug script to investigate the specific job ID: 122612da-16cb-4c02-b286-81f57224ae7b
-- Run these queries one by one to understand what's happening

-- 1. Check if the job exists at all
SELECT 
  id, 
  title, 
  employer_id, 
  status,
  created_at
FROM jobs 
WHERE id = '122612da-16cb-4c02-b286-81f57224ae7b';

-- 2. List all jobs that actually exist in the database
SELECT 
  id, 
  title, 
  employer_id,
  status,
  created_at
FROM jobs 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check applications for the specific job ID
SELECT 
  a.id,
  a.job_id,
  a.candidate_id,
  a.status,
  p.full_name as candidate_name
FROM applications a
LEFT JOIN profiles p ON a.candidate_id = p.id
WHERE a.job_id = '122612da-16cb-4c02-b286-81f57224ae7b';

-- 4. Check if any applications exist at all
SELECT COUNT(*) as total_applications FROM applications;

-- 5. List all applications with job and candidate details
SELECT 
  a.id as application_id,
  j.id as job_id,
  j.title as job_title,
  j.employer_id,
  p.full_name as candidate_name,
  a.status,
  a.created_at
FROM applications a
LEFT JOIN jobs j ON a.job_id = j.id
LEFT JOIN profiles p ON a.candidate_id = p.id
ORDER BY a.created_at DESC;

-- 6. Check employers and their jobs
SELECT 
  e.id as employer_id,
  e.name as employer_name,
  e.owner_id,
  COUNT(j.id) as job_count
FROM employers e
LEFT JOIN jobs j ON e.id = j.employer_id
GROUP BY e.id, e.name, e.owner_id;

-- 7. Check if the current user owns any employers (replace with actual user ID)
-- SELECT 
--   e.id as employer_id,
--   e.name as employer_name,
--   j.id as job_id,
--   j.title as job_title
-- FROM employers e
-- LEFT JOIN jobs j ON e.id = j.employer_id
-- WHERE e.owner_id = 'YOUR_USER_ID_HERE';

-- 8. Look for jobs with similar IDs (in case there's a typo)
SELECT 
  id,
  title,
  employer_id,
  SIMILARITY(id::text, '122612da-16cb-4c02-b286-81f57224ae7b') as similarity_score
FROM jobs
WHERE SIMILARITY(id::text, '122612da-16cb-4c02-b286-81f57224ae7b') > 0.1
ORDER BY similarity_score DESC
LIMIT 5;
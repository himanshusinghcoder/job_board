-- Debug script for candidate job recommendations
-- Run these queries to understand why recommendations aren't showing

-- 1. Check if there are any active jobs at all
SELECT 
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN active = true THEN 1 END) as active_jobs
FROM jobs;

-- 2. List some active jobs with details
SELECT 
  id,
  title,
  active,
  skills_required,
  remote,
  location,
  created_at,
  employer_id
FROM jobs 
WHERE active = true
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check current user's candidate profile
SELECT 
  user_id,
  skills,
  years_experience,
  work_type,
  visible,
  created_at
FROM candidate_profiles 
WHERE user_id = auth.uid();

-- 4. Check job active status
SELECT active, COUNT(*) as count 
FROM jobs 
GROUP BY active;

-- 5. Check if jobs have proper employer relationships
SELECT 
  j.id,
  j.title,
  j.status,
  e.id as employer_id,
  e.name as employer_name
FROM jobs j
LEFT JOIN employers e ON j.employer_id = e.id
WHERE j.status = 'published'
ORDER BY j.created_at DESC
LIMIT 5;

-- 6. Test job matching logic manually (replace YOUR_SKILLS with actual skills)
-- WITH candidate_skills AS (
--   SELECT ARRAY['React', 'JavaScript', 'TypeScript'] as skills
-- )
-- SELECT 
--   j.id,
--   j.title,
--   j.skills as job_skills,
--   cs.skills as candidate_skills,
--   -- Check for skill matches
--   (
--     SELECT COUNT(*)
--     FROM unnest(j.skills) job_skill
--     WHERE EXISTS (
--       SELECT 1 FROM unnest(cs.skills) candidate_skill
--       WHERE candidate_skill ILIKE '%' || job_skill || '%' 
--          OR job_skill ILIKE '%' || candidate_skill || '%'
--     )
--   ) as matching_skills_count
-- FROM jobs j
-- CROSS JOIN candidate_skills cs
-- WHERE j.status = 'published'
-- ORDER BY matching_skills_count DESC
-- LIMIT 10;

-- 7. Simple test to see what the React Query should return
SELECT 
  j.id,
  j.title,
  j.description,
  j.skills_required,
  j.remote,
  j.salary_min,
  j.salary_max,
  j.location,
  j.created_at,
  e.id as employer_id,
  e.name as employer_name,
  e.logo_url
FROM jobs j
LEFT JOIN employers e ON j.employer_id = e.id
WHERE j.active = true
ORDER BY j.created_at DESC
LIMIT 5;
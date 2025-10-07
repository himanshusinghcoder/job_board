-- Debug script for application status update issues
-- Run these queries to understand the relationships and permissions

-- 1. Check current user's profile and role
SELECT 
  id,
  role,
  full_name,
  created_at
FROM profiles 
WHERE id = auth.uid();

-- 2. Check employer memberships for current user
SELECT 
  em.employer_id,
  em.role as membership_role,
  e.name as employer_name,
  e.owner_id
FROM employer_members em
JOIN employers e ON em.employer_id = e.id
WHERE em.user_id = auth.uid();

-- 3. Check jobs owned by current user's employers
SELECT 
  j.id as job_id,
  j.title,
  j.employer_id,
  e.name as employer_name,
  j.status as job_status,
  COUNT(a.id) as application_count
FROM jobs j
JOIN employers e ON j.employer_id = e.id
JOIN employer_members em ON em.employer_id = e.id
LEFT JOIN applications a ON a.job_id = j.id
WHERE em.user_id = auth.uid()
GROUP BY j.id, j.title, j.employer_id, e.name, j.status
ORDER BY j.created_at DESC;

-- 4. Check specific application details
SELECT 
  a.id as application_id,
  a.status,
  a.job_id,
  j.title as job_title,
  j.employer_id,
  e.name as employer_name,
  p.full_name as candidate_name,
  a.created_at,
  a.updated_at
FROM applications a
JOIN jobs j ON a.job_id = j.id
JOIN employers e ON j.employer_id = e.id
JOIN profiles p ON a.candidate_id = p.id
WHERE a.id = '850e8400-e29b-41d4-a716-446655440001' -- Replace with actual application ID
ORDER BY a.created_at DESC;

-- 5. Test if current user can update a specific application (this should work if permissions are correct)
-- UNCOMMENT AND MODIFY THE APPLICATION ID TO TEST:
-- UPDATE applications 
-- SET status = 'reviewed', updated_at = NOW()
-- WHERE id = '850e8400-e29b-41d4-a716-446655440001' -- Replace with actual application ID
-- RETURNING id, status, updated_at;

-- 6. Check RLS policy effectiveness - see what applications the current user can see
SELECT 
  a.id,
  a.status,
  j.title,
  p.full_name as candidate_name,
  'can_view' as permission_check
FROM applications a
JOIN jobs j ON a.job_id = j.id
JOIN profiles p ON a.candidate_id = p.id
ORDER BY a.created_at DESC;

-- 7. Check if the user has the right employer membership for the job
WITH application_job_employer AS (
  SELECT 
    a.id as app_id,
    a.status,
    j.employer_id,
    em.user_id as member_user_id,
    em.role as member_role
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  LEFT JOIN employer_members em ON em.employer_id = j.employer_id
  WHERE a.id = '850e8400-e29b-41d4-a716-446655440001' -- Replace with actual application ID
)
SELECT 
  *,
  CASE 
    WHEN member_user_id = auth.uid() THEN 'Has Permission'
    ELSE 'No Permission'
  END as update_permission
FROM application_job_employer;
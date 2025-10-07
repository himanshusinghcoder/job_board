-- Test query to check if application exists and what data it contains
-- Replace 'e9bdfde0-145a-49bb-901f-07f69dd7f66e' with the actual application ID

SELECT 
    a.id,
    a.status,
    a.candidate_id,
    a.job_id,
    a.created_at,
    j.title as job_title,
    e.name as employer_name
FROM applications a
LEFT JOIN jobs j ON a.job_id = j.id
LEFT JOIN employers e ON j.employer_id = e.id
WHERE a.id = 'e9bdfde0-145a-49bb-901f-07f69dd7f66e';

-- Check if candidate profile exists for this application
SELECT 
    cp.user_id,
    cp.full_name,
    cp.email,
    a.candidate_id
FROM applications a
LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
WHERE a.id = 'e9bdfde0-145a-49bb-901f-07f69dd7f66e';

-- Check all applications to see what candidate_ids exist
SELECT 
    a.id,
    a.candidate_id,
    cp.full_name,
    cp.email
FROM applications a
LEFT JOIN candidate_profiles cp ON cp.user_id = a.candidate_id
LIMIT 10;
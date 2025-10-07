-- Test Data for Candidates Page
-- Run this AFTER deploying step2-add-missing-tables.sql

-- First, insert some test candidate profiles (assuming some profiles exist)
-- You'll need to replace the UUIDs with actual profile IDs from your profiles table

-- Insert test candidate profiles
-- Note: You'll need to get actual profile IDs from your profiles table where role = 'candidate'

-- Example of what the insert would look like:
-- INSERT INTO candidate_profiles (user_id, years_experience, salary_min, salary_max, work_type, skills, visible)
-- VALUES 
-- ('your-actual-profile-id-here', 3, 70000, 90000, ARRAY['remote', 'hybrid'], ARRAY['JavaScript', 'React', 'Node.js'], true);

-- To get actual profile IDs, first run:
SELECT id, full_name, role FROM profiles WHERE role = 'candidate' LIMIT 5;

-- Then use those IDs to insert candidate profiles:
-- Replace 'PROFILE_ID_HERE' with actual UUIDs from the query above

-- Example candidate 1: Junior Developer
-- INSERT INTO candidate_profiles (user_id, years_experience, salary_min, salary_max, work_type, skills, visible)
-- VALUES ('PROFILE_ID_HERE', 2, 50000, 70000, ARRAY['remote'], ARRAY['JavaScript', 'React', 'HTML', 'CSS'], true);

-- Example candidate 2: Senior Developer  
-- INSERT INTO candidate_profiles (user_id, years_experience, salary_min, salary_max, work_type, skills, visible)
-- VALUES ('PROFILE_ID_HERE', 5, 80000, 120000, ARRAY['remote', 'hybrid'], ARRAY['Python', 'Django', 'PostgreSQL', 'AWS'], true);

-- Example candidate 3: Full-Stack Developer
-- INSERT INTO candidate_profiles (user_id, years_experience, salary_min, salary_max, work_type, skills, visible)
-- VALUES ('PROFILE_ID_HERE', 4, 70000, 100000, ARRAY['hybrid', 'onsite'], ARRAY['TypeScript', 'React', 'Express', 'MongoDB'], true);

-- To create complete test data, you can also insert profiles first:
-- (Only if you want to create completely new test users)

/*
-- Insert test candidate users (optional - only if you need new test users)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'candidate1@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'candidate2@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'candidate3@test.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW());

-- Then insert corresponding profiles
-- (This would need to be done manually with the actual user IDs generated above)
*/

-- Quick way to check if candidates exist:
SELECT 
  p.full_name, 
  p.location,
  cp.years_experience,
  cp.skills,
  cp.work_type
FROM profiles p
JOIN candidate_profiles cp ON p.id = cp.user_id
WHERE p.role = 'candidate' AND cp.visible = true;
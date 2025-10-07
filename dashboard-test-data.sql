-- Enhanced Test Data for Job Board
-- This creates sample jobs, employers, and applications to test the candidate dashboard

-- First, let's create some test employers
INSERT INTO employers (id, name, website, description, logo_url, verified, owner_id, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'TechCorp Inc', 'https://techcorp.com', 'Leading technology company specializing in AI and machine learning solutions.', 'https://via.placeholder.com/100', true, (SELECT id FROM profiles WHERE role = 'employer' LIMIT 1), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'StartupXYZ', 'https://startupxyz.com', 'Fast-growing startup disrupting the fintech industry with innovative solutions.', 'https://via.placeholder.com/100', true, (SELECT id FROM profiles WHERE role = 'employer' LIMIT 1), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'DevStudio', 'https://devstudio.com', 'Creative agency focused on building beautiful web and mobile applications.', 'https://via.placeholder.com/100', false, (SELECT id FROM profiles WHERE role = 'employer' LIMIT 1), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create some test jobs
INSERT INTO jobs (id, employer_id, title, description, skills, location, remote, job_type, experience_level, salary_min, salary_max, status, created_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Senior Frontend Developer', 
'We are looking for an experienced Frontend Developer to join our team and build amazing user experiences using React and modern web technologies.

Responsibilities:
• Develop responsive web applications using React and TypeScript
• Collaborate with designers to implement pixel-perfect UIs
• Optimize applications for maximum speed and scalability
• Write clean, maintainable code with proper testing

Requirements:
• 5+ years of frontend development experience
• Expert knowledge of React, JavaScript, and TypeScript
• Strong CSS skills and responsive design principles
• Experience with modern build tools (Webpack, Vite)
• Knowledge of testing frameworks (Jest, Cypress)', 
ARRAY['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Vite', 'Jest'], 
'San Francisco, CA', true, 'full-time', 'senior', 120000, 160000, 'published', NOW() - INTERVAL '2 days'),

('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Full Stack Engineer', 
'Join our growing team as a Full Stack Engineer and help build the next generation of fintech solutions.

What you''ll do:
• Build scalable web applications using React and Node.js
• Design and implement RESTful APIs
• Work with PostgreSQL databases and optimize queries
• Deploy applications using Docker and AWS
• Collaborate in an agile development environment

What we''re looking for:
• 3+ years of full-stack development experience
• Proficiency in JavaScript, React, and Node.js
• Experience with SQL databases, preferably PostgreSQL
• Knowledge of cloud platforms (AWS, GCP, or Azure)
• Strong problem-solving skills and attention to detail',
ARRAY['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'], 
'New York, NY', false, 'full-time', 'mid', 90000, 130000, 'published', NOW() - INTERVAL '1 day'),

('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Python Backend Developer', 
'We''re seeking a talented Python Backend Developer to help scale our platform and build robust APIs.

Key Responsibilities:
• Develop and maintain Python-based backend services
• Design efficient database schemas and optimize queries
• Build RESTful APIs using Django or FastAPI
• Implement security best practices and data protection
• Work closely with frontend developers and product managers

Requirements:
• 4+ years of Python development experience
• Strong knowledge of Django or FastAPI
• Experience with PostgreSQL or similar databases
• Understanding of RESTful API design principles
• Familiarity with Redis, Celery, and message queues',
ARRAY['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Redis', 'API'], 
'Remote', true, 'full-time', 'mid', 95000, 125000, 'published', NOW()),

('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'UI/UX Designer', 
'Looking for a creative UI/UX Designer to join our design team and create beautiful, user-centered designs.

What you''ll create:
• User interface designs for web and mobile applications
• User experience flows and wireframes
• Design systems and component libraries
• Prototypes and interactive mockups
• Collaborate with developers to ensure design implementation

What you need:
• 3+ years of UI/UX design experience
• Proficiency in Figma, Sketch, or similar design tools
• Strong portfolio showcasing web and mobile designs
• Understanding of design systems and accessibility
• Knowledge of HTML/CSS is a plus',
ARRAY['Figma', 'Sketch', 'UI Design', 'UX Design', 'Prototyping', 'Design Systems'], 
'Austin, TX', false, 'full-time', 'mid', 75000, 105000, 'published', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Get a candidate profile ID to create sample applications
-- Note: Replace this with actual candidate profile IDs from your database
WITH candidate_user AS (
  SELECT id FROM profiles WHERE role = 'candidate' LIMIT 1
)

-- Create some sample applications for testing
INSERT INTO applications (id, job_id, candidate_id, status, created_at, updated_at) 
SELECT 
  gen_random_uuid(),
  job_id,
  candidate_user.id,
  status,
  created_at,
  updated_at
FROM candidate_user,
(VALUES 
  ('650e8400-e29b-41d4-a716-446655440001', 'pending', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('650e8400-e29b-41d4-a716-446655440002', 'reviewed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
  ('650e8400-e29b-41d4-a716-446655440003', 'pending', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
) AS apps(job_id, status, created_at, updated_at)
ON CONFLICT DO NOTHING;

-- Update or create candidate profile with skills for better job matching
INSERT INTO candidate_profiles (user_id, years_experience, salary_min, salary_max, work_type, skills, visible, created_at, updated_at)
SELECT 
  id,
  4, -- 4 years experience 
  85000,
  120000,
  ARRAY['remote', 'hybrid'],
  ARRAY['JavaScript', 'React', 'TypeScript', 'Node.js', 'Python', 'PostgreSQL'],
  true,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 day'
FROM profiles 
WHERE role = 'candidate' 
LIMIT 1
ON CONFLICT (user_id) DO UPDATE SET
  years_experience = EXCLUDED.years_experience,
  salary_min = EXCLUDED.salary_min,
  salary_max = EXCLUDED.salary_max,
  work_type = EXCLUDED.work_type,
  skills = EXCLUDED.skills,
  visible = EXCLUDED.visible,
  updated_at = EXCLUDED.updated_at;

-- Verification queries
SELECT 'Jobs created:' as info, COUNT(*) as count FROM jobs WHERE status = 'published';
SELECT 'Employers created:' as info, COUNT(*) as count FROM employers;
SELECT 'Applications created:' as info, COUNT(*) as count FROM applications;
SELECT 'Candidate profiles with skills:' as info, COUNT(*) as count FROM candidate_profiles WHERE array_length(skills, 1) > 0;
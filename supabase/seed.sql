-- Seed script for sample data
-- Run this after setting up the database schema

-- Insert sample admin user (you'll need to create this user via Supabase Auth first)
-- INSERT INTO profiles (id, role, full_name, headline, location, about) 
-- VALUES (
--   'admin-user-id-here',
--   'admin',
--   'Admin User',
--   'Platform Administrator',
--   'San Francisco, CA',
--   'Managing the JobFinder platform'
-- );

-- Insert sample employers
INSERT INTO profiles (id, role, full_name, headline, location, about) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'employer', 'Sarah Johnson', 'CEO at TechCorp', 'San Francisco, CA', 'Leading innovative technology solutions'),
  ('550e8400-e29b-41d4-a716-446655440002', 'employer', 'Michael Chen', 'CTO at StartupXYZ', 'New York, NY', 'Building the future of software'),
  ('550e8400-e29b-41d4-a716-446655440003', 'employer', 'Emma Wilson', 'Head of Engineering at DataFlow', 'Austin, TX', 'Passionate about data-driven solutions');

-- Insert sample candidates
INSERT INTO profiles (id, role, full_name, headline, location, about) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'candidate', 'Alex Rodriguez', 'Senior React Developer', 'San Francisco, CA', 'Passionate full-stack developer with 5+ years experience in React, Node.js, and AWS. Love building scalable web applications.'),
  ('550e8400-e29b-41d4-a716-446655440012', 'candidate', 'Jamie Smith', 'Full Stack Engineer', 'Remote', 'Experienced developer specializing in JavaScript, Python, and cloud technologies. Strong background in API design and microservices.'),
  ('550e8400-e29b-41d4-a716-446655440013', 'candidate', 'Morgan Lee', 'Frontend Developer', 'New York, NY', 'Creative frontend developer with expertise in React, Vue.js, and modern CSS. Focused on user experience and performance.'),
  ('550e8400-e29b-41d4-a716-446655440014', 'candidate', 'Casey Brown', 'DevOps Engineer', 'Seattle, WA', 'DevOps specialist with experience in Kubernetes, Docker, and CI/CD pipelines. Passionate about automation and infrastructure.'),
  ('550e8400-e29b-41d4-a716-446655440015', 'candidate', 'Taylor Davis', 'Data Scientist', 'Boston, MA', 'Data scientist with machine learning expertise. Experience with Python, R, TensorFlow, and big data technologies.');

-- Insert sample candidate profiles
INSERT INTO candidate_profiles (user_id, years_experience, salary_min, salary_max, work_type, skills, visible) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 5, 120000, 150000, ARRAY['onsite', 'hybrid']::work_type[], ARRAY['React', 'JavaScript', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL', 'Git'], true),
  ('550e8400-e29b-41d4-a716-446655440012', 6, 110000, 140000, ARRAY['remote', 'hybrid']::work_type[], ARRAY['JavaScript', 'Python', 'React', 'Django', 'Docker', 'Kubernetes', 'API Design'], true),
  ('550e8400-e29b-41d4-a716-446655440013', 3, 80000, 110000, ARRAY['onsite', 'hybrid']::work_type[], ARRAY['React', 'Vue.js', 'JavaScript', 'CSS', 'HTML', 'Figma', 'Tailwind CSS'], true),
  ('550e8400-e29b-41d4-a716-446655440014', 4, 100000, 130000, ARRAY['remote', 'onsite']::work_type[], ARRAY['Kubernetes', 'Docker', 'AWS', 'Terraform', 'Jenkins', 'Python', 'Bash'], true),
  ('550e8400-e29b-41d4-a716-446655440015', 4, 95000, 125000, ARRAY['remote', 'hybrid']::work_type[], ARRAY['Python', 'R', 'TensorFlow', 'Pandas', 'SQL', 'Machine Learning', 'Statistics'], true);

-- Insert sample employers
INSERT INTO employers (id, owner_id, name, website, verified) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'TechCorp Inc.', 'https://techcorp.com', true),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'StartupXYZ', 'https://startupxyz.com', false),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'DataFlow Solutions', 'https://dataflow.com', true);

-- Insert employer members (owners)
INSERT INTO employer_members (employer_id, user_id, role) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'owner'),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'owner'),
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'owner');

-- Insert sample jobs
INSERT INTO jobs (id, employer_id, title, description, skills, location, remote, job_type, experience_level, salary_min, salary_max, status) VALUES
  (
    '750e8400-e29b-41d4-a716-446655440001',
    '650e8400-e29b-41d4-a716-446655440001',
    'Senior React Developer',
    'We are looking for an experienced React developer to join our growing team. You will be responsible for building scalable web applications using React, TypeScript, and Node.js. The ideal candidate has experience with modern development practices, testing, and cloud deployment.

Key Responsibilities:
• Develop and maintain React applications
• Collaborate with design and backend teams
• Write clean, testable code
• Participate in code reviews
• Mentor junior developers

Requirements:
• 4+ years of React experience
• Strong TypeScript skills
• Experience with Node.js and APIs
• Knowledge of testing frameworks
• AWS or cloud platform experience preferred',
    ARRAY['React', 'TypeScript', 'JavaScript', 'Node.js', 'AWS', 'Testing'],
    'San Francisco, CA',
    false,
    'full-time',
    'senior',
    120000,
    150000,
    'published'
  ),
  (
    '750e8400-e29b-41d4-a716-446655440002',
    '650e8400-e29b-41d4-a716-446655440002',
    'Full Stack Engineer',
    'Join our innovative startup as a Full Stack Engineer! We are building next-generation software solutions and need someone who can work across the entire technology stack. This is a great opportunity to have significant impact in a fast-growing company.

What you will do:
• Build and maintain web applications
• Design and implement APIs
• Work with databases and data modeling
• Collaborate in an agile environment
• Contribute to architecture decisions

What we are looking for:
• 3+ years of full-stack development experience
• Proficiency in JavaScript/Python
• Experience with React or Vue.js
• Database design skills (SQL/NoSQL)
• Interest in startup culture and rapid iteration',
    ARRAY['JavaScript', 'Python', 'React', 'API Design', 'SQL', 'Agile'],
    'New York, NY',
    true,
    'full-time',
    'mid',
    100000,
    130000,
    'published'
  ),
  (
    '750e8400-e29b-41d4-a716-446655440003',
    '650e8400-e29b-41d4-a716-446655440003',
    'DevOps Engineer',
    'DataFlow Solutions is seeking a talented DevOps Engineer to help us scale our infrastructure and improve our deployment processes. You will work with cutting-edge technologies and help build reliable, scalable systems.

Responsibilities:
• Manage Kubernetes clusters and containerized applications
• Implement CI/CD pipelines
• Monitor system performance and reliability
• Automate infrastructure provisioning
• Collaborate with development teams on deployment strategies

Required Skills:
• 3+ years of DevOps/Infrastructure experience
• Strong knowledge of Kubernetes and Docker
• Experience with AWS or other cloud platforms
• Proficiency in Infrastructure as Code (Terraform, Ansible)
• Scripting skills (Python, Bash)
• Understanding of monitoring and logging tools',
    ARRAY['Kubernetes', 'Docker', 'AWS', 'Terraform', 'Python', 'CI/CD'],
    'Austin, TX',
    true,
    'full-time',
    'mid',
    110000,
    140000,
    'published'
  ),
  (
    '750e8400-e29b-41d4-a716-446655440004',
    '650e8400-e29b-41d4-a716-446655440001',
    'Frontend Developer',
    'We are looking for a creative Frontend Developer to join our user experience team. You will be responsible for creating beautiful, responsive, and performant user interfaces that delight our customers.

What you will build:
• Modern web applications using React
• Responsive designs that work across devices
• Interactive components and animations
• Accessible user interfaces
• Performance-optimized applications

What we need:
• 2+ years of frontend development experience
• Proficiency in React and modern JavaScript
• Strong CSS skills and design sense
• Experience with responsive design
• Knowledge of web accessibility standards
• Familiarity with design tools like Figma',
    ARRAY['React', 'JavaScript', 'CSS', 'HTML', 'Responsive Design', 'Figma'],
    'San Francisco, CA',
    false,
    'full-time',
    'mid',
    90000,
    115000,
    'published'
  ),
  (
    '750e8400-e29b-41d4-a716-446655440005',
    '650e8400-e29b-41d4-a716-446655440003',
    'Data Scientist',
    'Join our data team as a Data Scientist and help us unlock insights from our growing datasets. You will work on machine learning projects, statistical analysis, and data visualization to drive business decisions.

Your Impact:
• Develop machine learning models for predictive analytics
• Analyze large datasets to identify trends and patterns
• Create data visualizations and reports
• Collaborate with product teams on data-driven features
• Present findings to stakeholders

Requirements:
• 3+ years of data science experience
• Strong knowledge of Python and R
• Experience with machine learning libraries (scikit-learn, TensorFlow)
• Statistical analysis and hypothesis testing skills
• Data visualization experience (Matplotlib, Plotly, Tableau)
• SQL and database querying skills',
    ARRAY['Python', 'R', 'Machine Learning', 'TensorFlow', 'SQL', 'Statistics'],
    'Austin, TX',
    true,
    'full-time',
    'mid',
    105000,
    135000,
    'published'
  );

-- Insert sample applications
INSERT INTO applications (id, job_id, candidate_id, cover_letter, status) VALUES
  (
    '850e8400-e29b-41d4-a716-446655440001',
    '750e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440011',
    'I am excited to apply for the Senior React Developer position. With 5 years of experience in React and a strong background in TypeScript and Node.js, I believe I would be a great fit for this role. I have successfully built and deployed several scalable applications using AWS services.',
    'new'
  ),
  (
    '850e8400-e29b-41d4-a716-446655440002',
    '750e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440012',
    'I am very interested in the Full Stack Engineer position at StartupXYZ. My experience with JavaScript, Python, and API design aligns well with your requirements. I thrive in startup environments and enjoy working on challenging problems.',
    'shortlisted'
  ),
  (
    '850e8400-e29b-41d4-a716-446655440003',
    '750e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440014',
    'The DevOps Engineer role at DataFlow Solutions is exactly what I am looking for. I have extensive experience with Kubernetes, Docker, and AWS, and I am passionate about building reliable infrastructure. I would love to contribute to your team.',
    'interview'
  );

-- Note: Embeddings will be generated by the AI functions
-- Sample matches will be created when the matching functions are called
-- Messages can be added through the application interface

-- Grant necessary permissions for RLS (if needed)
-- This ensures the seed data respects the security policies

SELECT 'Seed data inserted successfully!' as result;
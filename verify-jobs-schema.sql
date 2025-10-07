-- Quick check to see what columns exist in your jobs table
-- Run this to verify the schema

-- 1. Show all columns in the jobs table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Show a sample job record to see what data looks like
SELECT * FROM jobs LIMIT 1;

-- 3. Check if any jobs have been created
SELECT COUNT(*) as total_jobs FROM jobs;

-- 4. Check job active status
SELECT active, COUNT(*) as count 
FROM jobs 
GROUP BY active;

-- 5. If there are jobs, show some sample data
SELECT 
  id,
  title,
  skills_required,
  remote,
  active,
  created_at
FROM jobs 
WHERE active = true
ORDER BY created_at DESC
LIMIT 5;
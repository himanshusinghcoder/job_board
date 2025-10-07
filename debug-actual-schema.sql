-- Comprehensive debug script to understand the actual database schema
-- Run these queries one by one to understand what's in your database

-- 1. Show the exact schema of the jobs table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'jobs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Show all jobs regardless of status/active (to see what data exists)
SELECT 
  id,
  title,
  -- Try both possible column names
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'status') 
    THEN status::text
    ELSE NULL
  END as status_if_exists,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'active') 
    THEN active::text
    ELSE NULL
  END as active_if_exists,
  -- Try both possible skills columns
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'skills') 
    THEN array_length(skills, 1)
    ELSE NULL
  END as skills_count,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'skills_required') 
    THEN array_length(skills_required, 1)
    ELSE NULL
  END as skills_required_count,
  created_at
FROM jobs 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count jobs by status (if status column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'status') THEN
    RAISE NOTICE 'Status column exists - showing counts by status:';
    PERFORM (SELECT status, COUNT(*) FROM jobs GROUP BY status);
  ELSE
    RAISE NOTICE 'Status column does not exist';
  END IF;
END $$;

-- 4. Count jobs by active (if active column exists)  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'active') THEN
    RAISE NOTICE 'Active column exists - showing counts by active:';
    PERFORM (SELECT active, COUNT(*) FROM jobs GROUP BY active);
  ELSE
    RAISE NOTICE 'Active column does not exist';
  END IF;
END $$;

-- 5. Show sample job data with all possible columns
SELECT 
  id,
  title,
  employer_id,
  remote,
  created_at
FROM jobs 
LIMIT 3;
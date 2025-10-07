-- Additional SQL functions for vector search and matching

-- Function to search candidates similar to a job
CREATE OR REPLACE FUNCTION match_candidates_to_job(
  job_embedding vector(3072),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 100
)
RETURNS TABLE (
  candidate_id uuid,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    cp.user_id as candidate_id,
    (cp.embedding <=> job_embedding) * -1 + 1 as similarity
  FROM candidate_profiles cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE 
    cp.embedding IS NOT NULL 
    AND cp.visible = true
    AND p.role = 'candidate'
    AND (cp.embedding <=> job_embedding) < (1 - match_threshold)
  ORDER BY cp.embedding <=> job_embedding
  LIMIT match_count;
$$;

-- Function to search jobs similar to a candidate
CREATE OR REPLACE FUNCTION match_jobs_to_candidate(
  candidate_embedding vector(3072),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  job_id uuid,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    j.id as job_id,
    (j.embedding <=> candidate_embedding) * -1 + 1 as similarity
  FROM jobs j
  WHERE 
    j.embedding IS NOT NULL 
    AND j.status = 'published'
    AND (j.embedding <=> candidate_embedding) < (1 - match_threshold)
  ORDER BY j.embedding <=> candidate_embedding
  LIMIT match_count;
$$;

-- Function to get job statistics for a specific employer
CREATE OR REPLACE FUNCTION get_employer_stats(employer_uuid uuid)
RETURNS TABLE (
  total_jobs bigint,
  published_jobs bigint,
  total_applications bigint,
  pending_applications bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE status = 'published') as published_jobs,
    COALESCE(SUM(app_count), 0) as total_applications,
    COALESCE(SUM(pending_count), 0) as pending_applications
  FROM jobs j
  LEFT JOIN (
    SELECT 
      job_id,
      COUNT(*) as app_count,
      COUNT(*) FILTER (WHERE status = 'new') as pending_count
    FROM applications
    GROUP BY job_id
  ) apps ON apps.job_id = j.id
  WHERE j.employer_id = employer_uuid;
$$;

-- Function to get candidate statistics
CREATE OR REPLACE FUNCTION get_candidate_stats(candidate_uuid uuid)
RETURNS TABLE (
  total_applications bigint,
  active_applications bigint,
  profile_views bigint,
  job_matches bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE a.id IS NOT NULL) as total_applications,
    COUNT(*) FILTER (WHERE a.status IN ('new', 'shortlisted', 'interview')) as active_applications,
    0 as profile_views, -- Placeholder - would need view tracking
    COUNT(*) FILTER (WHERE m.id IS NOT NULL) as job_matches
  FROM profiles p
  LEFT JOIN applications a ON a.candidate_id = p.id
  LEFT JOIN matches m ON m.candidate_id = p.id
  WHERE p.id = candidate_uuid;
$$;

-- Function to calculate basic compatibility score (fallback when AI is unavailable)
CREATE OR REPLACE FUNCTION calculate_basic_match_score(
  job_uuid uuid,
  candidate_uuid uuid
)
RETURNS int
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  score int := 50;
  job_rec record;
  candidate_rec record;
  skill_matches int := 0;
  total_job_skills int := 0;
BEGIN
  -- Get job details
  SELECT * INTO job_rec FROM jobs WHERE id = job_uuid;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Get candidate details
  SELECT p.*, cp.* INTO candidate_rec 
  FROM profiles p 
  JOIN candidate_profiles cp ON cp.user_id = p.id 
  WHERE p.id = candidate_uuid;
  IF NOT FOUND THEN RETURN 0; END IF;
  
  -- Calculate skill match score (40% weight)
  IF job_rec.skills IS NOT NULL AND array_length(job_rec.skills, 1) > 0 THEN
    total_job_skills := array_length(job_rec.skills, 1);
    
    SELECT COUNT(*) INTO skill_matches
    FROM unnest(job_rec.skills) job_skill
    WHERE EXISTS (
      SELECT 1 FROM unnest(candidate_rec.skills) candidate_skill
      WHERE candidate_skill ILIKE '%' || job_skill || '%' 
         OR job_skill ILIKE '%' || candidate_skill || '%'
    );
    
    score := score + (skill_matches * 40 / total_job_skills) - 20;
  END IF;
  
  -- Experience level matching (25% weight)
  IF job_rec.experience_level IS NOT NULL AND candidate_rec.years_experience IS NOT NULL THEN
    CASE job_rec.experience_level
      WHEN 'entry' THEN
        IF candidate_rec.years_experience BETWEEN 0 AND 2 THEN score := score + 15;
        ELSIF candidate_rec.years_experience BETWEEN 3 AND 5 THEN score := score + 5;
        ELSE score := score - 10;
        END IF;
      WHEN 'mid' THEN
        IF candidate_rec.years_experience BETWEEN 2 AND 7 THEN score := score + 15;
        ELSIF candidate_rec.years_experience < 2 THEN score := score - 10;
        ELSE score := score - 5;
        END IF;
      WHEN 'senior' THEN
        IF candidate_rec.years_experience >= 5 THEN score := score + 15;
        ELSIF candidate_rec.years_experience >= 3 THEN score := score + 5;
        ELSE score := score - 15;
        END IF;
      WHEN 'lead', 'executive' THEN
        IF candidate_rec.years_experience >= 8 THEN score := score + 15;
        ELSIF candidate_rec.years_experience >= 5 THEN score := score;
        ELSE score := score - 15;
        END IF;
    END CASE;
  END IF;
  
  -- Location matching (15% weight)
  IF job_rec.remote = true OR 'remote' = ANY(candidate_rec.work_type) THEN
    score := score + 10;
  ELSIF job_rec.location IS NOT NULL AND candidate_rec.location IS NOT NULL THEN
    IF job_rec.location ILIKE '%' || candidate_rec.location || '%' 
       OR candidate_rec.location ILIKE '%' || job_rec.location || '%' THEN
      score := score + 10;
    ELSE
      score := score - 15;
    END IF;
  END IF;
  
  -- Salary matching (10% weight)
  IF job_rec.salary_min IS NOT NULL AND job_rec.salary_max IS NOT NULL 
     AND candidate_rec.salary_min IS NOT NULL AND candidate_rec.salary_max IS NOT NULL THEN
    
    DECLARE
      job_mid float := (job_rec.salary_min + job_rec.salary_max) / 2.0;
      candidate_mid float := (candidate_rec.salary_min + candidate_rec.salary_max) / 2.0;
      diff_pct float := ABS(job_mid - candidate_mid) / job_mid;
    BEGIN
      IF diff_pct <= 0.15 THEN score := score + 5;
      ELSIF diff_pct <= 0.3 THEN score := score;
      ELSE score := score - 10;
      END IF;
    END;
  END IF;
  
  -- Ensure score is between 0 and 100
  score := GREATEST(0, LEAST(100, score));
  
  RETURN score;
END;
$$;
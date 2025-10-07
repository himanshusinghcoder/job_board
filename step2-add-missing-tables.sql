-- STEP 2: Add Missing Tables and Schema Components
-- Run this after step1-basic-auth.sql

-- First, let's create the necessary enums if they don't exist
DO $$ BEGIN
  CREATE TYPE work_type AS ENUM ('remote', 'hybrid', 'onsite');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE job_type AS ENUM ('full-time', 'part-time', 'contract', 'internship');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM ('pending', 'reviewed', 'interviewed', 'offered', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create candidate_profiles table
CREATE TABLE IF NOT EXISTS candidate_profiles (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
    years_experience INTEGER CHECK (years_experience >= 0 AND years_experience <= 50),
    salary_min INTEGER CHECK (salary_min >= 0),
    salary_max INTEGER CHECK (salary_max >= 0 AND (salary_min IS NULL OR salary_max >= salary_min)),
    work_type work_type[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    resume_url TEXT,
    visible BOOLEAN NOT NULL DEFAULT true,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for candidate_profiles
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for candidate_profiles
DROP POLICY IF EXISTS "Users can manage their own candidate profile" ON candidate_profiles;
CREATE POLICY "Users can manage their own candidate profile" ON candidate_profiles
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view visible candidate profiles" ON candidate_profiles;
CREATE POLICY "Users can view visible candidate profiles" ON candidate_profiles
    FOR SELECT USING (visible = true);

-- Create employers table
CREATE TABLE IF NOT EXISTS employers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    website TEXT,
    logo_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_id) -- One employer per owner
);

-- Enable RLS for employers
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for employers
DROP POLICY IF EXISTS "Employers can manage their own company" ON employers;
CREATE POLICY "Employers can manage their own company" ON employers
    FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Public can view employers" ON employers;
CREATE POLICY "Public can view employers" ON employers
    FOR SELECT USING (true);

-- Create jobs table (basic structure)
CREATE TABLE IF NOT EXISTS jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employer_id UUID REFERENCES employers(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    salary_min INTEGER,
    salary_max INTEGER,
    location TEXT,
    remote BOOLEAN DEFAULT false,
    job_type job_type DEFAULT 'full-time',
    skills_required TEXT[] DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for jobs
DROP POLICY IF EXISTS "Employers can manage their jobs" ON jobs;
CREATE POLICY "Employers can manage their jobs" ON jobs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM employers e WHERE e.id = jobs.employer_id AND e.owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can view active jobs" ON jobs;
CREATE POLICY "Users can view active jobs" ON jobs
    FOR SELECT USING (active = true);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status application_status DEFAULT 'pending',
    cover_letter TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(job_id, candidate_id) -- One application per job per candidate
);

-- Enable RLS for applications
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for applications
DROP POLICY IF EXISTS "Candidates can manage their applications" ON applications;
CREATE POLICY "Candidates can manage their applications" ON applications
    FOR ALL USING (auth.uid() = candidate_id);

DROP POLICY IF EXISTS "Employers can view applications to their jobs" ON applications;
CREATE POLICY "Employers can view applications to their jobs" ON applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs j 
            JOIN employers e ON e.id = j.employer_id 
            WHERE j.id = applications.job_id AND e.owner_id = auth.uid()
        )
    );

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all tables
DROP TRIGGER IF EXISTS update_candidate_profiles_updated_at ON candidate_profiles;
CREATE TRIGGER update_candidate_profiles_updated_at 
    BEFORE UPDATE ON candidate_profiles 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_employers_updated_at ON employers;
CREATE TRIGGER update_employers_updated_at 
    BEFORE UPDATE ON employers 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create useful indexes
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_visible ON candidate_profiles(visible);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_skills ON candidate_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_work_type ON candidate_profiles USING GIN(work_type);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_salary ON candidate_profiles(salary_min, salary_max);

CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(active);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN(skills_required);

CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

SELECT 'Missing tables and schema components added successfully!' as status;
-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employers ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = profiles.id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = profiles.id);

CREATE POLICY "Users can view public candidate profiles" ON profiles
    FOR SELECT USING (
        profiles.role = 'candidate' AND 
        EXISTS (
            SELECT 1 FROM candidate_profiles cp 
            WHERE cp.user_id = profiles.id AND cp.visible = true
        )
    );

CREATE POLICY "Employers can view candidate profiles when they apply" ON profiles
    FOR SELECT USING (
        profiles.role = 'candidate' AND 
        EXISTS (
            SELECT 1 FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN employer_members em ON em.employer_id = j.employer_id
            WHERE a.candidate_id = profiles.id AND em.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Candidate profiles policies
CREATE POLICY "Users can manage their own candidate profile" ON candidate_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view visible candidate profiles" ON candidate_profiles
    FOR SELECT USING (visible = true);

CREATE POLICY "Employers can view candidate profiles when they apply" ON candidate_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN employer_members em ON em.employer_id = j.employer_id
            WHERE a.candidate_id = user_id AND em.user_id = auth.uid()
        )
    );

-- Employers policies
CREATE POLICY "Users can view employers" ON employers
    FOR SELECT USING (true);

CREATE POLICY "Owners can manage their employer" ON employers
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Members can view their employer" ON employers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employer_members em 
            WHERE em.employer_id = employers.id AND em.user_id = auth.uid()
        )
    );

-- Employer members policies
CREATE POLICY "Members can view their memberships" ON employer_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage members" ON employer_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM employers e 
            WHERE e.id = employer_members.employer_id AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view employer members" ON employer_members
    FOR SELECT USING (true);

-- Jobs policies
CREATE POLICY "Anyone can view published jobs" ON jobs
    FOR SELECT USING (status = 'published');

CREATE POLICY "Employer members can view their jobs" ON jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employer_members em 
            WHERE em.employer_id = jobs.employer_id AND em.user_id = auth.uid()
        )
    );

CREATE POLICY "Employer members can manage their jobs" ON jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employer_members em 
            WHERE em.employer_id = employer_id AND em.user_id = auth.uid()
        )
    );

CREATE POLICY "Employer members can update their jobs" ON jobs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employer_members em 
            WHERE em.employer_id = jobs.employer_id AND em.user_id = auth.uid()
        )
    );

CREATE POLICY "Employer owners can delete their jobs" ON jobs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM employers e 
            WHERE e.id = jobs.employer_id AND e.owner_id = auth.uid()
        )
    );

-- Applications policies
CREATE POLICY "Candidates can view their applications" ON applications
    FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Candidates can create applications" ON applications
    FOR INSERT WITH CHECK (
        auth.uid() = candidate_id AND
        EXISTS (
            SELECT 1 FROM jobs j 
            WHERE j.id = job_id AND j.status = 'published'
        )
    );

CREATE POLICY "Candidates can update their applications" ON applications
    FOR UPDATE USING (
        auth.uid() = applications.candidate_id AND 
        applications.status = 'new' -- Only allow updates to new applications
    );

CREATE POLICY "Employers can view applications to their jobs" ON applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN employer_members em ON em.employer_id = j.employer_id
            WHERE j.id = applications.job_id AND em.user_id = auth.uid()
        )
    );

CREATE POLICY "Employers can update application status" ON applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN employer_members em ON em.employer_id = j.employer_id
            WHERE j.id = applications.job_id AND em.user_id = auth.uid()
        )
    );

-- Matches policies
CREATE POLICY "Candidates can view their matches" ON matches
    FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "Employers can view matches for their jobs" ON matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN employer_members em ON em.employer_id = j.employer_id
            WHERE j.id = matches.job_id AND em.user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage matches" ON matches
    FOR ALL USING (true); -- This will be restricted by JWT in edge functions

-- Messages policies
CREATE POLICY "Application participants can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM applications a 
            WHERE a.id = messages.application_id 
            AND (a.candidate_id = auth.uid() OR EXISTS (
                SELECT 1 FROM jobs j
                JOIN employer_members em ON em.employer_id = j.employer_id
                WHERE j.id = a.job_id AND em.user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Application participants can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM applications a 
            WHERE a.id = application_id 
            AND (a.candidate_id = auth.uid() OR EXISTS (
                SELECT 1 FROM jobs j
                JOIN employer_members em ON em.employer_id = j.employer_id
                WHERE j.id = a.job_id AND em.user_id = auth.uid()
            ))
        )
    );

-- Create helper functions for RLS
CREATE OR REPLACE FUNCTION public.user_role() 
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_employer_member(employer_uuid UUID) 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM employer_members 
        WHERE employer_id = employer_uuid AND user_id = auth.uid()
    )
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_employer_owner(employer_uuid UUID) 
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM employers 
        WHERE id = employer_uuid AND owner_id = auth.uid()
    )
$$ LANGUAGE sql SECURITY DEFINER;
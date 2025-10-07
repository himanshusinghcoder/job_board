-- STEP 1: Basic Authentication Setup
-- Run this AFTER the reset script

-- Create basic types (only if they don't exist)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('candidate', 'employer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create the profiles table with all necessary fields
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'candidate',
  full_name text,
  headline text,
  location text,
  about text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (id)
);

-- Add missing columns if the table already exists (safe migration)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'headline') THEN
    ALTER TABLE profiles ADD COLUMN headline text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE profiles ADD COLUMN location text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'about') THEN
    ALTER TABLE profiles ADD COLUMN about text;
  END IF;
END $$;

-- Enable RLS (safe to run multiple times)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, clear RLS policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
BEFORE UPDATE ON profiles 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create profile creation trigger for both INSERT and UPDATE (email confirmation)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
  user_name text;
  profile_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
  
  -- Only create profile if it doesn't exist
  IF NOT profile_exists THEN
    -- Get role from metadata (this is where we'll debug)
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'candidate');
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    
    -- Log what we receive (for debugging)
    RAISE LOG 'Creating profile - User: %, Email: %, Role from metadata: %, Full metadata: %', 
      NEW.id, NEW.email, user_role, NEW.raw_user_meta_data;
    
    -- Validate role
    IF user_role NOT IN ('candidate', 'employer', 'admin') THEN
      user_role := 'candidate';
    END IF;
    
    -- Insert profile
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (NEW.id, user_role::user_role, user_name);
    
    RAISE LOG 'Profile created successfully - ID: %, Role: %, Name: %', NEW.id, user_role, user_name;
  ELSE
    RAISE LOG 'Profile already exists for user %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error creating profile for user % - Error: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for both INSERT and UPDATE events
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE PROCEDURE handle_new_user();

-- Create a simple debug function
CREATE OR REPLACE FUNCTION debug_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  role user_role,
  full_name text,
  raw_metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    u.email,
    p.role,
    p.full_name,
    u.raw_user_meta_data,
    p.created_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC
  LIMIT 10;
END;
$$;

SELECT 'Basic authentication setup complete!' as status;
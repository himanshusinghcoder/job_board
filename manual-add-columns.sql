-- Manual SQL to run in Supabase Dashboard SQL Editor
-- This adds the missing columns to the employers table

-- Add description and location columns
ALTER TABLE employers 
ADD COLUMN description TEXT,
ADD COLUMN location TEXT;

-- Update any existing test data (optional)
UPDATE employers 
SET description = 'A growing technology company focused on innovation.'
WHERE description IS NULL;

-- You can also add some sample data
-- INSERT INTO employers (id, owner_id, name, website, logo_url, description, location, verified)
-- VALUES 
-- (uuid_generate_v4(), 'your-user-id', 'Sample Company', 'https://example.com', null, 'We are a sample company for testing.', 'San Francisco, CA', false)
-- ON CONFLICT (owner_id) DO UPDATE SET
--   name = EXCLUDED.name,
--   website = EXCLUDED.website,
--   description = EXCLUDED.description,
--   location = EXCLUDED.location;
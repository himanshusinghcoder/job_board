-- Add missing columns to employers table
ALTER TABLE employers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE employers ADD COLUMN IF NOT EXISTS location TEXT;
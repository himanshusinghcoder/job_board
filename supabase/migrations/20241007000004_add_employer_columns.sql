-- Migration: Add missing columns to employers table
-- This adds description and location columns that are needed for the employer profile

ALTER TABLE employers 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;
#!/bin/bash

# Supabase Database Setup Script
# This script will set up your Supabase database with all required tables and policies

echo "🚀 Setting up Supabase database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Initialize Supabase project (if not already initialized)
if [ ! -f "supabase/config.toml" ]; then
    echo "📦 Initializing Supabase project..."
    supabase init
fi

# Link to your Supabase project
echo "🔗 Linking to Supabase project..."
echo "Please run the following command with your Supabase project reference:"
echo "supabase link --project-ref jzqwqfjnkkjxflqlnzol"
echo ""

echo "📚 After linking, run these commands to apply the database schema:"
echo "1. supabase db push"
echo "   OR"
echo "2. Manually apply the SQL files in the Supabase dashboard:"
echo "   - Go to https://supabase.com/dashboard/project/jzqwqfjnkkjxflqlnzol/sql"
echo "   - Copy and paste the contents of each migration file:"
echo "     * supabase/migrations/20241007000001_initial_schema.sql"
echo "     * supabase/migrations/20241007000002_rls_policies.sql" 
echo "     * supabase/migrations/20241007000003_additional_functions.sql"
echo ""

echo "🔧 Don't forget to:"
echo "1. Enable the pgvector extension in the Supabase dashboard"
echo "2. Set up email authentication settings"
echo "3. Configure RLS policies"

echo ""
echo "✅ After setup, your sign-up should work!"
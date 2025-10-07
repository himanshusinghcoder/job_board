#!/bin/bash

# JobFinder Platform Deployment Script
# This script helps deploy the application to production

set -e  # Exit on any error

echo "🚀 JobFinder Platform Deployment Script"
echo "======================================="

# Check if required environment variables are set
check_env_vars() {
    echo "📋 Checking environment variables..."
    
    local required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY" 
        "OPENAI_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ Error: $var is not set"
            exit 1
        fi
    done
    
    echo "✅ All required environment variables are set"
}

# Install dependencies
install_deps() {
    echo "📦 Installing dependencies..."
    npm ci
    echo "✅ Dependencies installed"
}

# Build the application
build_app() {
    echo "🏗️  Building application..."
    npm run build
    echo "✅ Application built successfully"
}

# Deploy Supabase functions
deploy_functions() {
    echo "⚡ Deploying Supabase Edge Functions..."
    
    local functions=(
        "embed-candidate"
        "embed-job" 
        "match-job-candidates"
        "match-candidate-jobs"
        "extract-resume"
        "secure-chat"
    )
    
    for func in "${functions[@]}"; do
        echo "  📤 Deploying $func..."
        supabase functions deploy "$func" --no-verify-jwt=false
    done
    
    echo "✅ All Edge Functions deployed"
}

# Set function secrets
set_secrets() {
    echo "🔐 Setting Edge Function secrets..."
    
    supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY"
    supabase secrets set EMBED_MODEL="${EMBED_MODEL:-text-embedding-3-large}"
    supabase secrets set RERANK_MODEL="${RERANK_MODEL:-gpt-4o-mini}"
    supabase secrets set VECTOR_DIMS="${VECTOR_DIMS:-3072}"
    supabase secrets set MAX_UPLOAD_MB="${MAX_UPLOAD_MB:-5}"
    
    echo "✅ Secrets configured"
}

# Run database migrations
run_migrations() {
    echo "🗄️  Running database migrations..."
    supabase db push
    echo "✅ Database migrations completed"
}

# Seed database (optional)
seed_database() {
    if [ "$1" = "--with-seed" ]; then
        echo "🌱 Seeding database with sample data..."
        supabase db reset --linked
        echo "✅ Database seeded"
    fi
}

# Run tests
run_tests() {
    echo "🧪 Running tests..."
    npm test -- --run
    echo "✅ All tests passed"
}

# Main deployment function
main() {
    echo "Starting deployment process..."
    echo ""
    
    check_env_vars
    install_deps
    run_tests
    build_app
    
    if command -v supabase &> /dev/null; then
        echo "📡 Supabase CLI found, deploying backend..."
        run_migrations
        deploy_functions  
        set_secrets
        seed_database "$1"
    else
        echo "⚠️  Supabase CLI not found. Skipping backend deployment."
        echo "   Please install Supabase CLI and run the backend deployment manually."
    fi
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy frontend to your hosting platform (Vercel, Netlify, etc.)"
    echo "2. Update environment variables in your hosting platform"
    echo "3. Test the application thoroughly"
    echo "4. Monitor logs and performance"
    echo ""
    echo "🔗 Useful commands:"
    echo "  npm run dev          - Start development server"
    echo "  npm run build        - Build for production"
    echo "  npm test             - Run tests"
    echo "  supabase start       - Start local Supabase"
    echo "  supabase db reset    - Reset database with migrations"
}

# Run the main function with all arguments
main "$@"
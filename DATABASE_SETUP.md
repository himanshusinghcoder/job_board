# Deploy Database Schema Instructions

## Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `step2-add-missing-tables.sql`
5. Paste it into the SQL editor
6. Click "Run" to execute

## Method 2: Using Supabase CLI (if installed)

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Apply the migration
supabase db push
```

## Method 3: Copy SQL Content

Here's the SQL you need to run in Supabase:

```sql
-- Copy the contents of step2-add-missing-tables.sql and paste in Supabase SQL Editor
```

## After Running the Schema

The following tables will be created:
- ✅ candidate_profiles
- ✅ employers  
- ✅ jobs
- ✅ applications
- ✅ All necessary RLS policies
- ✅ Indexes for performance
- ✅ Functions and triggers

## Verification

After running the SQL, you can verify by checking:
1. Tables exist in Supabase dashboard > Database > Tables
2. Try creating a candidate profile in your app
3. The candidates page should show real data

## Next Steps

1. Create test users with candidate roles
2. Fill out their profiles with skills and experience
3. The candidates page will display them automatically
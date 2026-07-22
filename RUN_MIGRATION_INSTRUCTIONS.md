# How to Run the Initial Schema Migration

## Option 1: Supabase Dashboard (Easiest - Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/gjhvlivqjudxruxjmyfa
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `RUN_MIGRATION.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned" - this means it worked!

## Option 2: Using Supabase CLI (If you have it set up)

```bash
# First, login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref gjhvlivqjudxruxjmyfa

# Apply the migration
npx supabase db push
```

## What This Migration Does

✅ Creates all required tables:
- `elections` - Stores election information
- `candidates` - Stores candidate information
- `votes` - Stores vote records
- `user_biometrics` - Stores face recognition data
- `profiles` - Stores user profile information

✅ Creates database functions:
- `cast_vote()` - Secure vote casting function
- `has_user_voted()` - Check if user voted
- `get_candidate_votes()` - Get vote counts
- `handle_new_user()` - Auto-create profile on signup

✅ Creates views:
- `vote_results` - Aggregated vote results

✅ Creates triggers:
- Auto-creates profile when user signs up

## After Running This Migration

**Next Step**: Run the RLS policies migration:
- File: `supabase/migrations/20250101000001_rls_policies.sql`
- Or use: `RUN_RLS_POLICIES.sql` (if I create it)

## Verify Migration Success

After running, verify in Supabase Dashboard:
1. Go to **Table Editor**
2. You should see these tables: `elections`, `candidates`, `votes`, `user_biometrics`, `profiles`







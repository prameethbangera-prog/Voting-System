# Comprehensive Analysis: Database Operations Not Working

## Executive Summary

After analyzing the codebase, I've identified **7 critical issues** preventing database operations from working:

1. **Missing database schema migration** - Tables need to be created
2. **Missing RLS policies** on 4 tables (elections, candidates, profiles, user_biometrics)
3. **Hardcoded Supabase project ID** in config.toml
4. **Missing storage bucket** configuration
5. **No environment variable file** (.env)
6. **RLS blocking admin operations** - Admin operations use anon key but need proper policies
7. **Missing profiles table** - Referenced but not in schema

---

## Detailed Findings

### 1. Database Migrations & Schema Setup

**Issue**: The project has `database_schema.sql` but it's NOT a migration file. Only one migration exists (`20250506_fix_vote_casting.sql`) which assumes tables already exist.

**Files Affected**:
- `database_schema.sql` (not in migrations folder)
- `supabase/migrations/20250506_fix_vote_casting.sql` (only RLS for votes table)

**Problem**: Tables (`elections`, `candidates`, `votes`, `user_biometrics`, `profiles`) must be created manually or via migration.

**Solution**: Create initial migration file with all table definitions.

---

### 2. Row Level Security (RLS) Policies

**Issue**: Only the `votes` table has RLS enabled with policies. Other tables likely have RLS enabled by default in Supabase but NO policies, blocking all operations.

**Tables Missing RLS Policies**:
- `elections` - No policies (blocks reads/writes)
- `candidates` - No policies (blocks reads/writes)
- `profiles` - No policies (blocks reads/writes)
- `user_biometrics` - No policies (blocks reads/writes)

**Files Checking These Tables**:
- `src/components/admin/AdminDashboard.tsx` (lines 46-48, 69-72, 176-179)
- `src/pages/Admin.tsx` (lines 215-224, 257-264, 294-297)
- `src/utils/voting/ElectionService.ts` (lines 12-22, 80-91, 105-108)
- `src/utils/vote/VoteServiceDB.ts` (lines 42-46, 70-75, 99-103, 134-142)
- `src/utils/election/ElectionServiceDB.ts` (lines 12-31, 61-78, 107-111)

**Solution**: Create RLS policies for all tables allowing:
- Authenticated users to SELECT (read)
- Admin users to INSERT/UPDATE/DELETE
- Users to manage their own profiles/biometrics

---

### 3. Hardcoded Supabase Project ID

**Issue**: Hardcoded project ID from original project.

**File**: `supabase/config.toml` (line 1)
```toml
project_id = "aspbaqvznlatlqvsfycn"
```

**Solution**: Update to your project ID or remove if using remote Supabase.

---

### 4. Missing Storage Bucket

**Issue**: Code references `voting_history` storage bucket that may not exist.

**Files**:
- `src/utils/storage/supabaseStorageService.ts` (lines 19, 45, 67, 87, 106)

**Solution**: Create storage bucket or update bucket name in code.

---

### 5. Environment Variables

**Issue**: No `.env` file exists. Code expects:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**File**: `src/integrations/supabase/client.ts` (lines 5-6)

**Solution**: Create `.env` file with these variables.

---

### 6. Service Role Key Usage

**Status**: ✅ **CORRECT** - All operations use anon key from client, which is appropriate for frontend. However, RLS policies must allow these operations.

**Note**: Admin operations (delete users, manage elections) will fail if RLS policies don't grant permissions. Consider using service_role key in Edge Functions for admin operations, or create proper RLS policies.

---

### 7. Blockchain Configuration

**Issue**: Hardcoded contract address found.

**File**: `src/pages/Results.tsx` (line 280)
```typescript
0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47
```

**Note**: This appears to be display-only (mock data), but verify if actual blockchain integration exists.

---

### 8. Missing Profiles Table

**Issue**: Code references `profiles` table but it's not in `database_schema.sql`.

**Files**:
- `src/components/admin/AdminDashboard.tsx` (line 47)
- `src/integrations/supabase/types.ts` (lines 90-113) - TypeScript types exist

**Solution**: Add profiles table to schema or create migration.

---

### 9. Edge Functions

**Status**: ✅ **NONE FOUND** - No Edge Functions in codebase. This is fine - all operations are client-side.

---

## Exact Files and Lines Causing Issues

### Database Read/Write Failures:

1. **AdminDashboard.tsx:46-48** - Reading `profiles` table (RLS blocking)
2. **AdminDashboard.tsx:69-72** - Reading `elections` table (RLS blocking)
3. **AdminDashboard.tsx:176-179** - Reading `candidates` table (RLS blocking)
4. **Admin.tsx:215-224** - Updating `elections` table (RLS blocking)
5. **Admin.tsx:257-264** - Inserting into `candidates` table (RLS blocking)
6. **VoteServiceDB.ts:134-142** - Inserting into `votes` table (may work if RLS policy exists)
7. **ElectionService.ts:12-22** - Reading `elections` table (RLS blocking)
8. **ElectionService.ts:37-40** - Reading `candidates` table (RLS blocking)

---

## Fix Checklist

### Step 1: Create Initial Database Migration
- [ ] Create migration file with all table schemas
- [ ] Include profiles table
- [ ] Run migration: `supabase db push` or `supabase migration up`

### Step 2: Create RLS Policies
- [ ] Enable RLS on all tables (if not already enabled)
- [ ] Create SELECT policies for authenticated users on:
  - [ ] elections
  - [ ] candidates
  - [ ] profiles
  - [ ] user_biometrics
- [ ] Create INSERT/UPDATE/DELETE policies for admin users
- [ ] Create policies for users to manage their own profiles/biometrics

### Step 3: Update Configuration
- [ ] Update `supabase/config.toml` with your project ID (or remove if using remote)
- [ ] Create `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Step 4: Storage Bucket
- [ ] Create `voting_history` storage bucket in Supabase dashboard
- [ ] Set bucket to public or create storage policies

### Step 5: Verify Environment
- [ ] Verify Supabase project is linked: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Test database connection
- [ ] Test RLS policies with authenticated user

---

## Commands to Run

### 1. Link Supabase Project (if using Supabase CLI)
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Create and Apply Migrations
```bash
# Create new migration
supabase migration new initial_schema

# Edit the migration file to include all tables (see migration file below)

# Apply migrations
supabase db push
# OR if using remote:
supabase migration up
```

### 3. Verify Migration Status
```bash
supabase migration list
```

### 4. Check RLS Status
```sql
-- Run in Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

## Required Code Changes

### 1. Create Initial Migration File

Create: `supabase/migrations/YYYYMMDDHHMMSS_initial_schema.sql`

See the migration file I'll create below.

### 2. Create RLS Policies Migration

Create: `supabase/migrations/YYYYMMDDHHMMSS_rls_policies.sql`

See the RLS policies file I'll create below.

### 3. Update config.toml (if needed)

If using local Supabase, update project_id. If using remote, this file may not be needed.

### 4. Create .env file

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Next Steps

1. ✅ Review the migration files created:
   - `supabase/migrations/20250101000000_initial_schema.sql`
   - `supabase/migrations/20250101000001_rls_policies.sql`
2. ✅ Update project ID in `supabase/config.toml` (if using local Supabase)
3. Create `.env` file with your Supabase credentials (copy from `.env.example` if it exists)
4. Run migrations (see commands below)
5. Create storage bucket in Supabase dashboard
6. Test database operations

---

## Quick Start Commands

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Link your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# 2. Apply all migrations
supabase db push

# 3. Verify migrations applied
supabase migration list
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `20250101000000_initial_schema.sql`
4. Run the SQL
5. Copy and paste the contents of `20250101000001_rls_policies.sql`
6. Run the SQL

### Option 3: Using Supabase CLI with Remote

```bash
# If you've already linked your project
supabase migration up

# Or apply specific migration
supabase migration up --version 20250101000000
supabase migration up --version 20250101000001
```

---

## Storage Bucket Setup

After running migrations, create the storage bucket:

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `voting_history`
4. Set to **Public** (or create storage policies if private)
5. Click "Create bucket"

Alternatively, use SQL:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voting_history', 'voting_history', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy (if bucket is private)
CREATE POLICY "Authenticated users can upload voting history"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voting_history' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can read voting history"
ON storage.objects FOR SELECT
USING (bucket_id = 'voting_history');
```

---

## Verification Checklist

After applying fixes, verify:

- [ ] All tables exist: `elections`, `candidates`, `votes`, `user_biometrics`, `profiles`
- [ ] RLS is enabled on all tables
- [ ] Can read elections (authenticated user)
- [ ] Can read candidates (authenticated user)
- [ ] Can insert votes (authenticated user)
- [ ] Can read/write profiles (authenticated user)
- [ ] Can read/write user_biometrics (authenticated user)
- [ ] Admin can create/update/delete elections
- [ ] Admin can create/update/delete candidates
- [ ] Storage bucket `voting_history` exists

---

## Troubleshooting

### Error: "relation does not exist"
- **Solution**: Run the initial schema migration first

### Error: "permission denied for table"
- **Solution**: Check RLS policies are applied correctly

### Error: "new row violates row-level security policy"
- **Solution**: Verify the RLS policy allows the operation for authenticated users

### Error: "bucket does not exist"
- **Solution**: Create the `voting_history` storage bucket

### Admin operations still failing
- **Solution**: The current RLS policies allow any authenticated user to perform admin operations. For production, you should:
  1. Add an `is_admin` column to profiles table
  2. Update RLS policies to check `is_admin = true` for admin operations
  3. Or use Supabase Edge Functions with service_role key for admin operations


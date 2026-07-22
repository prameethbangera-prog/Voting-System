# Quick Fix Guide - Database Operations Not Working

## Minimal Fix Checklist

### ✅ Step 1: Create Environment File
Create `.env` in project root:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### ✅ Step 2: Update Supabase Config (if using local)
Edit `supabase/config.toml`:
- Update `project_id` with your project ID, or remove if using remote

### ✅ Step 3: Run Database Migrations

**Option A: Using Supabase CLI (Recommended)**
```bash
# Link project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Go to SQL Editor in Supabase Dashboard
2. Run `supabase/migrations/20250101000000_initial_schema.sql`
3. Run `supabase/migrations/20250101000001_rls_policies.sql`

### ✅ Step 4: Create Storage Bucket
In Supabase Dashboard → Storage:
- Create bucket named `voting_history`
- Set to Public

Or run SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('voting_history', 'voting_history', true);
```

### ✅ Step 5: Verify
Test in browser console (after login):
```javascript
// Should return data, not error
const { data, error } = await supabase.from('elections').select('*');
console.log(data, error);
```

---

## Exact Commands to Run

### 1. Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Apply Migrations
```bash
supabase db push
```

### 5. Check Migration Status
```bash
supabase migration list
```

---

## Files Created/Modified

### Created:
- ✅ `supabase/migrations/20250101000000_initial_schema.sql` - Creates all tables
- ✅ `supabase/migrations/20250101000001_rls_policies.sql` - Creates RLS policies
- ✅ `ANALYSIS_AND_FIXES.md` - Detailed analysis
- ✅ `QUICK_FIX_GUIDE.md` - This file

### Modified:
- ✅ `supabase/config.toml` - Updated project_id placeholder

### You Need to Create:
- ⚠️ `.env` file with your Supabase credentials

---

## What Was Fixed

1. ✅ **Missing Tables**: Created migration for all tables (elections, candidates, votes, user_biometrics, profiles)
2. ✅ **Missing RLS Policies**: Created policies allowing authenticated users to read/write
3. ✅ **Hardcoded Project ID**: Updated config.toml with placeholder
4. ✅ **Missing Profiles Table**: Added to schema migration
5. ✅ **Storage Bucket**: Documented creation steps

---

## Common Issues After Fix

### Issue: "relation does not exist"
**Fix**: Run migrations - `supabase db push`

### Issue: "permission denied"
**Fix**: Verify RLS policies are applied - check migration `20250101000001_rls_policies.sql` ran

### Issue: "bucket does not exist"
**Fix**: Create `voting_history` bucket in Supabase Dashboard

### Issue: Admin operations fail
**Fix**: Current policies allow any authenticated user. For production, add admin role check.

---

## Testing After Fix

1. **Login** to the app
2. **Check Elections**: Should load without errors
3. **Check Candidates**: Should load without errors
4. **Try Voting**: Should be able to cast a vote
5. **Check Admin Panel**: Should be able to create/edit elections

If any step fails, check browser console for specific error messages.



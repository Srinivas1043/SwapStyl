# 🔧 Fix Profiles Table - Complete Setup

## Problem
Your `profiles` table has issues:
1. Missing columns: `role`, `email`, `suspended_at`, `suspension_reason`
2. Some rows have NULL values (incomplete profile creation)
3. Profiles aren't being created automatically when users sign up

## Solution (10 minutes)

### Step 1: Run the Profile Fix Migration
1. Go to **Supabase Dashboard → SQL Editor**
2. Click **New Query**
3. Copy all code from: `DB/fix_profiles_table.sql`
4. Click **Run**
5. Wait for "Success"

This migration will:
- ✅ Add missing columns (role, email, suspended_at, etc.)
- ✅ Populate email field for existing profiles
- ✅ Create auto-population trigger for new signups
- ✅ Fix all NULL rows
- ✅ Set up proper RLS policies

### Step 2: Populate Email for Existing Users
Run this to fill in missing emails from auth.users:

```sql
-- Check how many are NULL before
SELECT COUNT(*) FROM public.profiles WHERE email IS NULL;

-- Update from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Verify all now have emails
SELECT COUNT(*) FROM public.profiles WHERE email IS NULL;
```

### Step 3: Apply Admin Migration
Now apply the admin system migration if you haven't:

**Copy from:** `DB/migration_admin_system.sql`

Or run the simplified version:

```sql
-- Ensure moderation fields exist
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'auto_approved',
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id),
  reported_type TEXT NOT NULL,
  reported_item_id uuid REFERENCES public.items(id),
  reported_user_id uuid REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Create moderation_log table
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id uuid NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id uuid NOT NULL,
  reason TEXT,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Set specific user as admin
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Step 4: Verify Everything Works

Run these checks to confirm:

```sql
-- 1. Check all columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check no NULL emails (should return 0)
SELECT COUNT(*) FROM public.profiles WHERE email IS NULL;

-- 3. Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- 4. Check admin exists
SELECT email, role FROM public.profiles WHERE role = 'admin';

-- 5. Check moderation tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('reports', 'moderation_log');
```

### Step 5: Test New Signups
1. Create a new test account in the mobile app
2. Check Supabase: **Table Editor → profiles**
3. New profile should appear automatically with:
   - ✅ username (generated)
   - ✅ email (from auth.users)
   - ✅ full_name (from signup form)
   - ✅ created_at (timestamp)

### Step 6: Refresh Admin Panel
1. Log out of admin
2. Log back in
3. ✅ Should now see all users in the Users page

---

## Troubleshooting

### "Column already exists" error
This means the fix was already partially applied. That's OK - continue with the next step.

### NULL emails still appear
Run the update query from Step 2 manually to sync emails.

### New signups still not creating profiles
1. Check trigger exists: 
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. If not found, re-run the fix migration
3. Check auth.users table has the new user:
   ```sql
   SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
   ```
4. Check it appears in profiles seconds later:
   ```sql
   SELECT id, email FROM public.profiles ORDER BY created_at DESC LIMIT 1;
   ```

### Still seeing "Failed to fetch" in admin
After fixing profiles:
1. Log out of admin panel completely
2. Clear browser cookies
3. Use Incognito/Private window
4. Log back in
5. Refresh page

---

## Files Updated
- ✅ `DB/fix_profiles_table.sql` - Profile table fixes
- ✅ `backend/routers/auth.py` - Improved profile creation
- ✅ Error handling in admin endpoints

## What's Different Now

**Before:**
- Profiles created with minimal data
- Email not synced to profiles table
- No auto-trigger for new signups
- Incomplete rows with NULL values

**After:**
- Profiles auto-created when users sign up
- Email, username, created_at all populated
- Admin fields (role, suspended_at) available
- All NULL rows fixed
- Proper RLS policies in place

---

**Next:** Follow the 6 steps above, then refresh your admin panel! 🎉

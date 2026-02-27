# 🔧 Fix Profiles Table - Complete Setup

## ⚠️ Important: Database Schema Clarification

**DO NOT add email to profiles table.** Here's the correct schema:

| Table | Purpose | Contains |
|-------|---------|----------|
| `auth.users` | Supabase managed auth | email, password, created_at, updated_at |
| `public.profiles` | User metadata | id, username, full_name, avatar_url, bio, location, phone, gender, role, suspended_at, suspension_reason, etc. |

Email comes from `auth.users`, **NOT** from `profiles`.

Problem and Solution:

**Problem:**
1. Missing columns in profiles: `role`, `suspended_at`, `suspension_reason` (admin fields)
2. Profiles not auto-created when users signup
3. Admin dashboard can't fetch users because it's looking for email in the wrong place

**Solution:**

## Step 1: Run the Profile Fix Migration
1. Go to **Supabase Dashboard → SQL Editor**
2. Click **New Query**
3. Copy all code from: `DB/fix_profiles_table.sql`
4. Click **Run**

This migration will:
- ✅ Add admin columns: `role`, `suspended_at`, `suspension_reason`
- ✅ Create auto-trigger to create profile when auth user signs up
- ✅ Create a SQL view joining auth.users + profiles for admin queries
- ✅ Set up proper RLS policies

## Step 2: Set Your User as Admin

Run this query:

```sql
-- First, find your auth user ID
SELECT id, email FROM auth.users LIMIT 5;

-- Then set as admin (replace ID)
UPDATE public.profiles 
SET role = 'admin'
WHERE id = 'YOUR_USER_ID_HERE';

-- Verify
SELECT id, role FROM public.profiles WHERE role = 'admin';
```

## Step 3: Backend Now Properly Fetches Email

The backend will:
1. Query `public.profiles` for metadata and role/suspension fields
2. Fetch `auth.users` separately to get email addresses
3. Return combined user data to admin dashboard

```python
# Backend does this:
profiles = supabase.table("profiles").select(...).execute()
auth_users = supabase.auth.admin.list_users()  # Get all emails
# Combine: user["email"] = auth_users_map[user["id"]]
```

## Step 4: Test New Signups

When a user signs up:
1. ✅ `auth.users` row created with email/password
2. ✅ `public.profiles` row auto-created by trigger with username, etc.
3. ✅ NO email in profiles (correct!)

## Step 5: Refresh Admin Panel

1. Log out completely
2. Clear browser cookies
3. Log back in
4. ✅ Users page should now display all users with emails

---

## Troubleshooting

### Still seeing "Failed to fetch" on admin panel

**Check 1: Migration Applied**
```sql
-- Should return role, suspended_at, suspension_reason
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('role', 'suspended_at', 'suspension_reason');
```

**Check 2: You are an admin**
```sql
SELECT email FROM auth.users WHERE id = 'YOUR_ID';
SELECT role FROM public.profiles WHERE id = 'YOUR_ID';
```
Role should be 'admin'.

**Check 3: Backend is running**
```bash
cd backend
python -m uvicorn main:app --reload
```

**Check 4: Try a fresh login**
- Clear ALL cookies
- Use Incognito window
- Log in again

### Email shows as "user-xxxx@swapstyl.app" placeholder

This means the backend can't fetch the user's actual email from `auth.users`. 

**Fix:** Make sure Supabase service role key is configured in backend `.env`:
```
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

---

## Files Modified

- ✅ `DB/fix_profiles_table.sql` - Migration with admin columns + trigger + view
- ✅ `backend/routers/auth.py` - Don't add email to profiles, only auth.users
- ✅ `backend/routers/admin.py` - Fetch email from auth.users, not profiles
- ✅ This documentation

---

**Summary:**
- Profiles table: metadata ONLY
- Auth table: email/password/auth stuff
- Admin dashboard: queries both + combines results ✅


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

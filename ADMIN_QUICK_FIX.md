# 🚀 Admin Panel Fix - Follow These Steps

## Problem
Your admin panel shows "Failed to fetch" because the database hasn't been set up yet.

## Solution (Takes 5 minutes)

### Step 1: Go to Supabase Dashboard
- Open https://app.supabase.com
- Select your SwapStyl project

### Step 2: Run the Migration
1. Click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy all the code from: `DB/migration_admin_system.sql`
4. Paste it into the SQL editor
5. Click **Run** (⌘+Enter or Ctrl+Enter)
6. Wait for "Success. No rows returned."

### Step 3: Make Yourself an Admin
In the same SQL editor, run this query (replace the email):

```sql
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Verify:
SELECT email, role FROM public.profiles WHERE role = 'admin';
```

### Step 4: Refresh the Admin Panel
- Log out (click Logout button)
- Log back in with your email/password
- ✅ You should now see users, products, and logs!

---

## If It Still Shows "Failed to fetch"

### Check 1: Did the migration really run?
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';
```
- If no results: Migration didn't apply. Try again.
- If results: Migration worked ✅

### Check 2: Are you actually an admin?
```sql
SELECT email, role FROM public.profiles WHERE email = 'your-email@example.com';
```
- If role is NULL or 'user': Run the admin update query above
- If role is 'admin': ✅ Correct

### Check 3: Is the backend running?
Open terminal and run:
```bash
cd backend
python -m uvicorn main:app --reload
```
You should see: `Uvicorn running on http://127.0.0.1:8000`

### Check 4: Log out completely
- Clear browser cookies OR
- Use Incognito/Private window
- Try logging in again

---

## What the Migration Does

✅ Adds `role` column to profiles (admin, moderator, user)
✅ Adds `suspended_at` and `suspension_reason` columns
✅ Creates `moderation_log` table for audit trail
✅ Creates `reports` table for user reports
✅ Sets up security policies (RLS)

## File Locations

- 📄 Migration script: `DB/migration_admin_system.sql`
- 📖 Setup guide: `ADMIN_DATABASE_SETUP.md` (detailed)
- 🔌 API endpoints: `backend/routers/admin.py`
- 🖥️ Frontend: `admin-web/app/dashboard/`

---

**That's it! You're done. The admin panel is now ready to use.** 🎉

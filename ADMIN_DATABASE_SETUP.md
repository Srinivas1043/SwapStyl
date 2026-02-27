# Admin System - Database Setup Guide

## ⚠️ Current Issue

The admin panel shows "Failed to fetch" because the database migrations haven't been applied yet. The `profiles` table is missing required columns:
- `role` (admin, moderator, user)
- `suspended_at`
- `suspension_reason`

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Migrations in Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query and copy-paste the content from **`DB/migration_admin_system.sql`**
4. Click **Run** and wait for completion
5. You should see: "Success. No rows returned."

### Step 2: Create Admin User

After migrations are applied, you need to set your Supabase user as admin:

```sql
-- Replace YOUR_USER_ID with your actual Supabase user ID
UPDATE public.profiles 
SET role = 'admin'
WHERE id = 'YOUR_USER_ID';

-- Verify it worked:
SELECT id, email, role FROM public.profiles WHERE role = 'admin';
```

**To find YOUR_USER_ID:**
- Go to Supabase Dashboard → Authentication → Users
- Copy the UUID from the user you want to make admin

### Step 3: Refresh Admin Panel

1. Log out of the admin panel
2. Log back in with your admin credentials
3. You should now see all users, products, and logs

## 🧪 Testing the Setup

### Test 1: Check Database Columns
Run this query in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;
```

Expected columns:
- `role` (text)
- `suspended_at` (timestamp with time zone)
- `suspension_reason` (text)

### Test 2: Check Admin Tables Exist
```sql
-- Should return 3 results if migrations worked
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('reports', 'moderation_log', 'profiles');
```

### Test 3: Test Backend Connectivity
```bash
# Get your admin token from browser DevTools:
# 1. Open Chrome DevTools → Application → Cookies
# 2. Find 'admin_token' value

# Replace ADMIN_TOKEN with actual token
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  http://localhost:8000/admin/users
```

Expected response:
```json
{
  "users": [
    {
      "id": "...",
      "full_name": "Your Name",
      "email": "your@email.com",
      "role": "admin",
      ...
    }
  ],
  "page": 1,
  "page_size": 20,
  "total": 1,
  "has_more": false
}
```

## 📋 Troubleshooting

### "Failed to fetch" still appears after setup:

1. **Check token expiry**
   - Log out and log back in
   - Tokens expire after a period

2. **Verify migrations ran**
   ```sql
   SELECT * FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'role';
   ```
   If empty, migrations didn't run.

3. **Check backend is running**
   ```bash
   curl http://localhost:8000/
   ```
   Should return: `{"message": "Welcome to SwapStyl API"}`

4. **Check CORS is enabled**
   Backend already has CORS enabled for all origins in `main.py`

### "User does not have admin access" error:

```sql
-- Check if your user has admin role
SELECT id, email, role FROM public.profiles 
WHERE email = 'your@email.com';

-- If role is NULL or 'user', update it:
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your@email.com';
```

### No users appear even after setup:

```sql
-- Check total user count
SELECT COUNT(*) FROM public.profiles;

-- If 0, no users exist in database yet
-- They'll appear when:
-- 1. Users sign up in the mobile app
-- 2. You manually create users via Supabase auth
```

## 🔐 Security Notes

- Only users with `role = 'admin'` or `role = 'moderator'` can access admin endpoints
- All admin actions are logged in `moderation_log` table
- RLS policies ensure non-admins can't view the logs
- Service-role key bypasses RLS for backend operations

## 📚 Additional Resources

- Migrations: `DB/migration_admin_system.sql`
- Backend endpoints: `backend/routers/admin.py`
- Frontend components: `admin-web/app/dashboard/`
- Database schema: `DB/schema.sql`

---

**Next Steps:**
1. ✅ Run migration
2. ✅ Create admin user
3. ✅ Refresh admin panel
4. ✅ View users/products/logs
5. 🎉 Admin system is live!

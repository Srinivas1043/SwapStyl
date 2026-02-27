# Database Schema - Quick Reference

## ✅ Correct Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                      auth.users (Supabase)                      │
│                                                                 │
│  id (UUID)  │ email (string)  │ password_hash  │ created_at    │
│  ─────────────────────────────────────────────────────────────  │
│  abc123...  │ user@example.com│ hash...       │ 2026-02-27   │
│  def456...  │ admin@app.com   │ hash...       │ 2026-02-27   │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Links via id
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    public.profiles (Metadata)                   │
│                                                                 │
│  id (UUID)  │ username │ full_name │ avatar_url │ role │ ...  │
│  ─────────────────────────────────────────────────────────────  │
│  abc123...  │ john123  │ John Doe  │ https://.. │ null │      │
│  def456...  │ admin    │ Admin     │ https://.. │admin │      │
│  ...        │ ...      │ ...       │ ...        │ ...  │ ...  │
│  - suspended_at (timestamp)      ← for admin suspension       │
│  - suspension_reason (text)      ← why they were suspended   │
└─────────────────────────────────────────────────────────────────┘
```

## ❌ WRONG

```
❌ public.profiles should NOT contain:
   - email (in auth.users, not here!)
   - password (in auth.users, not here!)
   
❌ auth.users should NOT have metadata like:
   - username
   - full_name
   - bio
   - avatar_url
```

## Admin Dashboard Data Flow

```
1. User visits /admin/users

2. Backend queries profiles table:
   SELECT id, username, full_name, avatar_url, role, suspended_at FROM profiles

3. Backend also fetches auth users:
   auth_users = supabase.auth.admin.list_users()

4. Backend JOINS both:
   results = []
   for profile in profiles:
       result = profile
       result.email = auth_users_map[profile.id]
       results.append(result)

5. Return combined data to frontend:
   {
     "id": "abc123...",
     "username": "john123",
     "email": "john@example.com",     ← From auth.users
     "full_name": "John Doe",         ← From profiles
     "role": null,                    ← From profiles
     "avatar_url": "https://...",     ← From profiles
     ...
   }
```

## How to Query

### ✅ CORRECT - Get all users
```python
# Use service-role client (backend has this)
profiles = supabase.table("profiles").select("*").execute()
auth_users = supabase.auth.admin.list_users()

# Combine in backend code
```

### ✅ CORRECT - Update user role
```sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'user-id'
```

### ✅ CORRECT - Suspend user  
```sql
UPDATE public.profiles 
SET suspended_at = NOW(), suspension_reason = 'Violating ToS'
WHERE id = 'user-id'
```

### ❌ DON'T - Try to get email from profiles
```python
# WRONG!
profiles = supabase.table("profiles").select("email").execute()
# profiles table doesn't have email column!
```

### ❌ DON'T - Add email to profiles
```sql
-- WRONG!
ALTER TABLE profiles ADD COLUMN email TEXT;
-- Use auth.users instead
```

## When User Signs Up (Flow)

```
1. User submits email + password

2. create_user(email, password)
   └─ Creates row in auth.users
   
3. Trigger: on_auth_user_created fires
   └─ Automatically creates row in public.profiles
   └─ Sets id, username (from email), created_at
   └─ Email NOT stored here

4. Both tables filled:
   auth.users → email stored here ✅
   profiles → username, metadata here ✅
```

## File Changes Made

1. ✅ `DB/fix_profiles_table.sql` - Adds admin columns, trigger, view
2. ✅ `backend/routers/auth.py` - Signup doesn't add email to profiles
3. ✅ `backend/routers/admin.py` - Fetches email from auth.users properly
4. ✅ Documentation - Explains this schema

## Setup Checklist

- [ ] Run migration: `DB/fix_profiles_table.sql`
- [ ] Set yourself as admin: `UPDATE profiles SET role='admin'`
- [ ] Log out and log back in
- [ ] Admin dashboard shows users with emails ✅
- [ ] New signups create profiles automatically ✅

---

**Remember: Profiles = Metadata. Auth = Credentials. Different tables!**

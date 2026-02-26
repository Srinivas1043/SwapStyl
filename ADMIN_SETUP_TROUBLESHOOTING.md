# Admin System Setup & Troubleshooting Guide

## ✅ Issues Fixed

### admin-mobile
✅ Fixed import path in `AdminAuthGuard.tsx` - removed undefined `setToken()` call
✅ Fixed auth guard flow - now properly checks token without AdminContext
✅ Updated `app/_layout.tsx` - simplified to AdminProvider wrapper only
✅ Added proper authentication check to `(admin)/_layout.tsx`
✅ Fixed `(auth)/login.tsx` - added route validation
✅ Updated `app.json` with SDK 54.0.0
✅ Updated package.json with SDK 54 compatible dependencies:
  - expo: ^54.0.0
  - expo-router: ~6.0.0
  - expo-secure-store: ~15.0.0
  - react: 19.1.0
  - react-native: 0.81.5

### admin-web
✅ Fixed import path in `app/page.tsx` - login.module.css → page.module.css
✅ All dashboard pages properly configured with TypeScript

## 🚀 Quick Start

### Step 1: Backend Setup
```bash
# Make sure backend is running on port 8000
cd backend
python -m uvicorn main:app --reload

# Test endpoint:
# curl http://localhost:8000/admin/dashboard
# Should return JSON with metrics (even if 0s)
```

### Step 2: Database Setup
```sql
-- Run this in Supabase SQL Editor:
-- Copy contents of DB/migration_admin_system.sql
-- Execute to create admin tables and columns

-- Then create admin user:
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your_user_id_here';

-- Verify:
SELECT email, role FROM profiles WHERE role = 'admin';
```

### Step 3: Admin Mobile App
```bash
cd admin-mobile
npm install  # Already done, but just in case

# Start dev server
npx expo start --clear

# Then choose:
# i - iOS Simulator
# a - Android Emulator
# w - Web browsers
```

### Step 4: Admin Web Dashboard
```bash
cd admin-web
npm install  # If needed
cp .env.local.example .env.local
# Update NEXT_PUBLIC_API_URL if backend is not on localhost:8000

npm run dev
# Navigate to http://localhost:3000
```

## 🔍 Testing the Complete Flow

### Test 1: Login
**Mobile:**
1. Open app on simulator
2. Enter admin email and password
3. Should redirect to dashboard with 5 stat cards

**Web:**
1. Open http://localhost:3000
2. Enter admin email and password
3. Should redirect to /dashboard with sidebar

### Test 2: Dashboard Metrics
- Should show 5 cards:
  - Pending Reviews
  - Open Reports
  - Suspended Users
  - Total Items
  - Total Users
- All values should be >= 0

### Test 3: Product Review (if items exist)
1. Create test item in main app (upload clothing)
2. Item should appear in admin Products tab
3. Test Approve button (should remove from pending)
4. Create another item
5. Test Reject button (should option to add reason)

### Test 4: User Report
1. In main app, flag an item or user
2. In admin Reports tab, should see the report
3. Click resolve → should have option to take action
4. Verify report status changes to resolved

### Test 5: User Suspension
1. In admin Users tab, find a test user
2. Click suspend button
3. Add suspension reason
4. User should no longer be able to login to main app

## 🐛 Troubleshooting

### "Module not found" errors
**Problem:** Metro bundler can't find module
**Solution:**
```bash
# Clear cache and reinstall
cd admin-mobile
rm -Recurse node_modules package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```

### "Unable to resolve dependency" errors
**Problem:** Peer dependency conflicts with SDK 54
**Solution:**
```bash
# Always use legacy-peer-deps flag with current package versions
npm install --legacy-peer-deps
```

### Login shows "Invalid credentials"
**Problems to check:**
1. Backend is not running on port 8000
   - Run: `python -m uvicorn main:app --reload`
   - Test: `curl http://localhost:8000/admin/dashboard`

2. User doesn't have admin role
   - Check Supabase: `SELECT role FROM profiles WHERE id = 'your_id'`
   - Update: `UPDATE profiles SET role = 'admin' WHERE id = 'your_id'`

3. Environment variable mismatch (web only)
   - Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
   - Should match backend URL (usually http://localhost:8000 for local development)

### Dashboard shows "Failed to load"
**Problems to check:**
1. Backend `/admin/dashboard` endpoint not responding
   - Test: `curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/admin/dashboard`
   - Check backend/routers/admin.py is imported in main.py

2. Admin role not set on user
   - See "Login shows Invalid credentials" above

3. Migration not applied
   - Run: `DB/migration_admin_system.sql` in Supabase SQL Editor

### Blank page in web dashboard
**Solutions:**
1. Open browser DevTools (F12) → Console tab
   - See any error messages? Report them with full error text

2. Check environment variables:
   ```bash
   cat admin-web/.env.local
   # Should have: NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. Clear browser cache and cookies:
   - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
   - Clear storage: DevTools → Application → Clear Site Data

4. Check backend is running and responding to requests

### Mobile app shows white screen after login
**Solutions:**
1. Check that `/admin/dashboard` endpoint returns valid JSON
2. Verify Colors.ts file exists in constants/
3. Check that all import paths use `../../constants` pattern

### Products/Reports/Users pages empty
**Problems to check:**
1. No data created yet (this is normal)
   - Create test items/reports first via main app

2. Backend endpoint not returning data
   - Test individually:
   ```bash
   curl -H "Authorization: Bearer TOKEN" http://localhost:8000/admin/items/pending
   curl -H "Authorization: Bearer TOKEN" http://localhost:8000/admin/reports
   curl -H "Authorization: Bearer TOKEN" http://localhost:8000/admin/users
   ```

3. API access token expired
   - Log out and log back in

## 📋 Dependency Versions (for reference)

### Expo SDK 54 Compatible Versions
```json
{
  "expo": "^54.0.0",
  "expo-router": "~6.0.0",
  "expo-secure-store": "~15.0.0",
  "expo-status-bar": "~3.0.0",
  "expo-font": "~14.0.0",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-native-screens": "~4.16.0",
  "react-native-safe-area-context": "~5.6.0",
  "@react-native-async-storage/async-storage": "~2.2.0",
  "@expo/vector-icons": "^15.0.3"
}
```

### Next.js Admin Web Stack
```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.0",
  "@supabase/supabase-js": "^2.39.0",
  "axios": "^1.6.0",
  "js-cookie": "^3.0.5"
}
```

## 🔒 Security Checklist

- [ ] Admin credentials are NOT shared via email
- [ ] JWT tokens expire (default: 24 hours)
- [ ] All admin actions are logged to moderation_log table
- [ ] API endpoints validate admin role before processing
- [ ] Sensitive data (passwords) not logged anywhere
- [ ] HTTPS used in production (not just localhost)
- [ ] Database backups automated

## 📚 File Structure Reference

```
admin-mobile/
├── app/
│   ├── _layout.tsx (Root with AdminProvider)
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   └── (admin)/
│       ├── _layout.tsx (Tabs with auth check)
│       ├── index.tsx (Dashboard)
│       ├── products.tsx
│       ├── reports.tsx
│       ├── users.tsx
│       └── logs.tsx
├── context/
│   ├── AdminContext.tsx (Auth + API)
│   └── AdminAuthGuard.tsx (Auth check)
└── constants/
    └── Colors.ts

admin-web/
├── app/
│   ├── layout.tsx (Root)
│   ├── page.tsx (Login)
│   ├── globals.css
│   └── dashboard/
│       ├── layout.tsx (Sidebar + nav)
│       ├── page.tsx (Main dashboard)
│       ├── products.tsx
│       ├── reports.tsx
│       ├── users.tsx
│       └── logs.tsx
└── lib/
    └── api.ts (API client)
```

## 🆘 Still Having Issues?

1. **Check log output carefully** - error messages are very specific
2. **Test backend endpoint separately** - use curl or Postman
3. **Verify database permissions** - can user read/write to required tables?
4. **Clear all caches** - expo cache, npm cache, browser cache
5. **Try fresh install** - delete node_modules, package-lock, and reinstall

## 📞 Support Resources

- [Expo Documentation](https://docs.expo.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Documentation](https://reactnative.dev)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last Updated:** February 26, 2026
**Admin System Version:** 1.0.0
**SDK Version:** Expo 54 + Next.js 14

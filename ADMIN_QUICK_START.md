# SwapStyl Admin System - Quick Start Guide

Get the complete admin system (mobile + web) running locally in 10 minutes.

## Prerequisites

- Node.js 16+ installed
- Backend running on `http://localhost:8000`
- Supabase project set up with migrations applied

## Step 1: Apply Database Migration

```bash
# Open Supabase SQL Editor
# Copy contents of DB/migration_admin_system.sql
# Execute the migration
# This creates all admin tables and columns
```

## Step 2: Make Your User Admin

```sql
-- In Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your_user_id_here';
```

## Step 3: Backend Setup

```bash
# Backend should already be running, verify:
# 1. Admin router is imported in backend/main.py
# 2. Run: cd backend && python -m uvicorn main:app --reload
# 3. Test: curl http://localhost:8000/admin/dashboard
```

## Step 4: Run Mobile Admin App

```bash
cd admin-mobile
npm install

# Choose one:
npm run ios      # iPhone Simulator
npm run android  # Android Emulator
npm run web      # Web version
```

Then:
1. Open the app
2. Login with your admin credentials
3. See dashboard with stats
4. Browse tabs: Products, Reports, Users, Logs

## Step 5: Run Web Admin Dashboard

```bash
cd admin-web
npm install
cp .env.local.example .env.local
# Update NEXT_PUBLIC_API_URL if needed (default: http://localhost:8000)

npm run dev
# Open http://localhost:3000
```

Then:
1. Open browser to localhost:3000
2. See login page
3. Login with admin credentials
4. Access full dashboard with sidebar navigation

## Testing Features

### Test Product Review
```bash
# Create a test item via main app
# Item should appear in admin app Products tab
# Click Approve or Reject
```

### Test User Report
```bash
# In main app, flag an item or user
# In admin app Reports tab, see the report
# Click Review → Resolve
```

### Test User Suspension
```bash
# In admin Users tab, find a test user
# Click Suspend, add reason
# Go back to main app, try login with suspended user
# Should show suspension message
```

### Test Product Deletion
```bash
# Open admin web dashboard
# Products tab → Reject item with reason
# Or delete directly from Users admin section
# Item should disappear from main app feed
```

## Environment Variables

### Mobile App
- None needed (uses hardcoded API_URL in context)
- Update in: `admin-mobile/context/AdminContext.tsx` line 5

### Web Dashboard
- Copy `.env.local.example` to `.env.local`
- Update: `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Common Issues

### "Admin access required" login error
- Check your user's role in database: `SELECT role FROM profiles WHERE id = 'your_id'`
- Set to 'admin': `UPDATE profiles SET role = 'admin' WHERE id = 'your_id'`

### Connection refused errors
- Verify backend is running on port 8000
- Check API URL in environment variables
- Look at browser console for detailed errors

### Blank page in web dashboard
- Check browser console (F12) for errors
- Verify .env.local is set correctly
- Clear cookies and reload
- Try incognito window

### Items not appearing in queue
- Create items via main app first
- Items need `moderation_status = 'pending_review'`
- Check database: `SELECT status FROM items LIMIT 5`

## Architecture

```
User uploads item
    ↓
Item created with moderation_status = 'pending_review'
    ↓
Admin reviews in Products tab
    ↓
Approve → moderation_status = 'approved' → visible to users
    OR
Reject → moderation_status = 'rejected' → hidden, reason stored
```

## File Structure

```
admin-mobile/
├── app/
│   ├── (auth)/login.tsx            Login screen
│   ├── (admin)/_layout.tsx         Tab navigation
│   ├── (admin)/index.tsx           Dashboard
│   ├── (admin)/products.tsx        Product review
│   ├── (admin)/reports.tsx         Reports
│   ├── (admin)/users.tsx           Users
│   └── (admin)/logs.tsx            Logs
├── context/
│   ├── AdminContext.tsx            API client + auth
│   └── AdminAuthGuard.tsx          Auth check
└── constants/Colors.ts

admin-web/
├── app/
│   ├── page.tsx                    Login page
│   └── dashboard/
│       ├── layout.tsx              Sidebar + nav
│       ├── page.tsx                Dashboard
│       ├── products.tsx            Products
│       ├── reports.tsx             Reports
│       ├── users.tsx               Users
│       └── logs.tsx                Logs
└── lib/api.ts                      API client
```

## Next Steps

1. ✅ Database migrations applied
2. ✅ Backend running with admin APIs
3. ✅ Mobile admin app running
4. ✅ Web admin dashboard running
5. Test all features
6. Create backup of admin users
7. Set up automated logs backup
8. Configure production deployment

## Production Deployment

### Mobile
```bash
cd admin-mobile
eas build --platform all
# Then distribute via TestFlight/Google Play
```

### Web
```bash
cd admin-web
vercel
# Or: npm run build && npm start on your server
```

## Support

For detailed information:
- [Admin System Documentation](./ADMIN_SYSTEM.md)
- [Mobile App README](./admin-mobile/README.md)
- [Web Dashboard README](./admin-web/README.md)
- [Backend Admin Router](./backend/routers/admin.py)

---

That's it! You now have a complete admin system with mobile + web apps. 🎉

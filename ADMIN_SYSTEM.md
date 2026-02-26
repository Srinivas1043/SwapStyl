# SwapStyl Admin System Documentation

Complete admin system for moderation, content review, and user management across mobile and web platforms.

## 📱 Architecture Overview

```
SwapStyl/
├── frontend/                    (End-user mobile app - React Native)
├── backend/                     (FastAPI API)
│   ├── routers/
│   │   ├── admin.py            ✨ NEW - Admin API endpoints
│   │   └── ...
│   └── main.py                 (Updated with admin router)
├── DB/
│   ├── migration_admin_system.sql  ✨ NEW - Admin DB schema
│   └── ...
├── admin-mobile/                ✨ NEW - Admin mobile app (React Native)
│   ├── app/
│   ├── context/
│   ├── constants/
│   ├── package.json
│   └── README.md
└── admin-web/                   ✨ NEW - Admin web dashboard (Next.js)
    ├── app/
    ├── lib/
    ├── package.json
    └── README.md
```

## 🎯 Features Implemented

### All Admin Platforms (Mobile + Web) Include:

✅ **Dashboard**
- Real-time system statistics
- Pending review count
- Open reports count
- Suspended users count
- Total items and users overview

✅ **Product Review (Moderation Queue)**
- List pending items with images
- Approve items (auto-approved status)
- Reject items with required reason
- Pagination for large queues
- Item owner information

✅ **User Reports & Flagging**
- View items or users flagged by community
- Filter by report type (item/user)
- Filter by status (open/all)
- Resolve reports with action details
- Reporter information and timestamps

✅ **User Management**
- List all users with details
- Filter active vs suspended users
- Suspend users with reason
- Unsuspend/restore users
- Admin action history

✅ **Moderation Logs**
- Audit trail of all admin actions
- Action type, timestamp, and details
- Reason for each action
- Searchable and filterable

### Backend Admin APIs

All endpoints protected with admin role check (`@check_admin` decorator):

```
GET  /admin/dashboard                          - System stats
GET  /admin/items/pending                      - Pending items list
POST /admin/items/{id}/moderate                - Approve/reject item
DELETE /admin/items/{id}                       - Delete item (soft delete)
GET  /admin/reports                            - All reports
POST /admin/reports                            - User can flag item/user
PATCH /admin/reports/{id}                      - Admin resolves report
GET  /admin/users                              - User list
POST /admin/users/{id}/suspend                 - Suspend user
POST /admin/users/{id}/unsuspend               - Unsuspend user
```

### Database Schema

New tables and columns:

```sql
-- Profiles table additions
ALTER TABLE profiles ADD COLUMN role ENUM('user', 'admin', 'moderator');
ALTER TABLE profiles ADD COLUMN suspended_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;

-- Items table additions
ALTER TABLE items ADD COLUMN moderation_status ENUM('auto_approved', 'pending_review', 'approved', 'rejected');
ALTER TABLE items ADD COLUMN moderation_reason TEXT;
ALTER TABLE items ADD COLUMN reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE items ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE items ADD COLUMN deleted_at TIMESTAMP;

-- New tables
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id),
  reported_type {'item', 'user'},
  reported_item_id UUID REFERENCES items(id),
  reported_user_id UUID REFERENCES profiles(id),
  reason TEXT,
  description TEXT,
  status {'open', 'resolved', 'dismissed'},
  action_taken TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  created_at TIMESTAMP
);

CREATE TABLE moderation_log (
  id UUID PRIMARY KEY,
  moderator_id UUID REFERENCES profiles(id),
  action_type TEXT,
  target_type TEXT,
  target_id UUID,
  reason TEXT,
  created_at TIMESTAMP
);
```

## 📦 Platforms

### Mobile Admin App (`admin-mobile/`)

**Tech Stack:**
- Expo Router (File-based routing)
- React Native
- Supabase (Auth + API)
- Context API for state management

**Screens:**
- 🔐 Login screen with email/password
- 📊 Dashboard tab (5 stat cards)
- 📦 Products tab (scrollable list, quick approve/reject)
- 🚩 Reports tab (filtered, card-based layout)
- 👥 Users tab (list, suspend/restore)
- 📋 Logs tab (audit trail)

**Run:**
```bash
cd admin-mobile
npm install
npm run ios    # or android, or web
```

### Web Admin Dashboard (`admin-web/`)

**Tech Stack:**
- Next.js 14 with App Router
- TypeScript
- CSS Modules
- Responsive design

**Pages:**
- 🔐 Login page (full-screen form)
- 📊 Dashboard (grid of stat cards)
- 📦 Products page (table view with pagination)
- 🚩 Reports page (card list with filters)
- 👥 Users page (data table)
- 📋 Logs page (timeline view)

**Features:**
- Collapsible sidebar navigation
- Mobile-responsive layout
- Table sorting and pagination
- Modal dialogs for confirmations
- Real-time table updates

**Run:**
```bash
cd admin-web
npm install
npm run dev    # Development at localhost:3000
```

## 🔐 Security Features

✅ Role-based access control (admin/moderator only)
✅ JWT token-based authentication
✅ Secure token storage (httpOnly cookies)
✅ All admin actions logged with moderator ID and timestamp
✅ Soft deletes (never permanently removes data)
✅ RLS policies on sensitive tables (reports, moderation_log)
✅ Backend validates admin role on every request

## 🚀 Deployment Checklist

1. **Database Migration**
   ```sql
   -- Run on Supabase
   -- Execute migration_admin_system.sql
   ```

2. **Backend Deployment**
   ```bash
   cd backend
   # Update main.py with admin router
   # Deploy to your server/Vercel/Railway
   ```

3. **Mobile Admin App**
   ```bash
   cd admin-mobile
   # Option A: EAS Build (Expo)
   eas build --platform all
   
   # Option B: Local development with Expo Go
   npm run ios/android
   ```

4. **Web Admin Dashboard**
   ```bash
   cd admin-web
   # Copy .env.local.example to .env.local
   # Update NEXT_PUBLIC_API_URL
   
   # Vercel deployment (recommended)
   vercel
   
   # Or manual: npm run build && npm start
   ```

## 📊 Usage Examples

### Admin Login
Both mobile and web require admin role in database:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'admin_user_id';
```

### Review Pending Product
1. Open admin app (mobile or web)
2. Navigate to "Products" tab/page
3. See list of items pending review
4. Click item to preview
5. Choose "Approve" or "Reject"
6. If reject, provide reason (required)
7. Confirm - item status updated

### Resolve User Report
1. Navigate to "Reports" tab/page
2. Filter by "Open" to see unresolved
3. Click "Review" to open
4. View report details and target
5. Optionally add action taken
6. Click "Resolve"

### Suspend User
1. Navigate to "Users" tab/page
2. Find user in list
3. Click "Suspend" button
4. Enter reason (mobile) or optional (web)
5. Confirm - sets suspended_at timestamp
6. User cannot log in while suspended

## 🔄 Integration with User App

**Automatic moderation flow:**
1. User uploads item → item created with `moderation_status = 'pending_review'`
2. AI scores < 75% → flagged for manual review
3. Admin approves → `moderation_status = 'approved'` → item visible to others
4. Admin rejects → `moderation_status = 'rejected'` → item hidden, reason stored

**Item deletion impact:**
- Deletes from swipes table (matching records)
- Deletes from wishlists table (bookmarks)
- Leaves reviews as-is (history preservation)
- Soft deletes item (sets deleted_at)

## 📝 Admin Workflows

### Morning Moderation Routine
1. Check dashboard for pending items count
2. Go to Products → review pending queue
3. Check Reports → resolve flagged content
4. Review Users → unsuspend if time served
5. Check Logs → verify all actions

### Handling Abuse Report
1. View report details (item/user)
2. Review content and reason
3. Decide: Reject item OR Suspend user
4. Add action taken notes
5. Mark report as resolved
6. Auto-logged with your user ID

## 🛠️ Troubleshooting

**Admin can't log in**
- Check `profiles.role` is set to 'admin' or 'moderator'
- Verify backend is running
- Check token endpoint `/auth/login`

**Items not showing in pending queue**
- Check items have `moderation_status = 'pending_review'`
- Verify items not marked `deleted_at`
- Check pagination

**Reports not appearing**
- Check report_status is 'open' (not resolved/dismissed)
- Verify reported_type is 'item' or 'user'
- Check reported IDs exist

## 📚 Additional Resources

- [Mobile Admin App README](./admin-mobile/README.md)
- [Web Dashboard README](./admin-web/README.md)
- [Backend Admin Router](./backend/routers/admin.py)
- [Database Migration](./DB/migration_admin_system.sql)

---

**Status: ✅ Complete**
- Backend APIs: Implemented
- Mobile app: Implemented
- Web dashboard: Implemented
- Database schema: Implemented
- Ready for production deployment

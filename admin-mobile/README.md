# SwapStyl Admin Mobile App

React Native admin application for moderation, content review, user management, and reporting in the SwapStyl ecosystem.

## Features

- **Dashboard**: Overview of pending items, reports, and user counts
- **Product Review**: Approve or reject pending items with reasons
- **User Reports**: View and resolve user-submitted reports for items/users
- **User Management**: Suspend/unsuspend users, manage accounts
- **Moderation Logs**: Audit trail of all admin actions

## Setup

### Prerequisites
- Node.js 16+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Installation

```bash
cd admin-mobile
npm install
```

### Configuration

Update `context/AdminContext.tsx` with your backend API URL:

```typescript
const API_URL = "http://localhost:8000"; // Change to your backend URL
```

### Running

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Architecture

```
admin-mobile/
├── app/
│   ├── (auth)/              # Authentication screens
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (admin)/             # Admin dashboard screens (tab-based)
│   │   ├── _layout.tsx      # Tab navigation
│   │   ├── index.tsx        # Dashboard
│   │   ├── products.tsx     # Product review
│   │   ├── reports.tsx      # User reports
│   │   ├── users.tsx        # User management
│   │   └── logs.tsx         # Moderation logs
│   └── _layout.tsx          # Root layout with auth guard
├── context/
│   ├── AdminContext.tsx     # Admin auth context & API
│   └── AdminAuthGuard.tsx   # Authentication guard
├── constants/
│   └── Colors.ts            # Color palette
├── app.json
├── package.json
└── index.js
```

## API Integration

The app expects the following backend endpoints:

- `POST /auth/login` - Admin login
- `GET /admin/dashboard` - Dashboard stats
- `GET /admin/items/pending` - List pending items
- `POST /admin/items/{id}/moderate` - Approve/reject item
- `DELETE /admin/items/{id}` - Delete item
- `GET /admin/reports` - List reports
- `PATCH /admin/reports/{id}` - Resolve report
- `GET /admin/users` - List users
- `POST /admin/users/{id}/suspend` - Suspend user
- `POST /admin/users/{id}/unsuspend` - Unsuspend user

## Authentication

Admin users must have `role = 'admin'` or `role = 'moderator'` in the Supabase `profiles` table.

Login tokens are securely stored using `expo-secure-store` and automatically attached to all API requests.

## Styling

The app uses React Native's `StyleSheet` API with a centralized color theme. Colors are defined in `constants/Colors.ts`.

## Development Notes

- All moderation actions are logged in the backend
- Admin users can only be created through database/backend operations
- API errors are displayed via `Alert` dialogs
- Loading states are shown during API calls
- The app supports pagination for lists with load-more functionality

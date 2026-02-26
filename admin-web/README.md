# SwapStyl Admin Web Dashboard

Next.js web admin dashboard for moderation, content review, user management, and reporting in the SwapStyl ecosystem.

## Features

- **Dashboard**: Overview of pending items, reports, user counts with real-time stats
- **Product Review**: Table-based interface to approve/reject pending items with bulk actions
- **User Reports**: View and filter reported items/users, resolve with detailed actions
- **User Management**: Manage user accounts, suspend/unsuspend with audit trail
- **Moderation Logs**: Complete audit trail of all admin actions for compliance
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Authentication**: Secure admin token-based authentication

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: CSS Modules
- **State Management**: React Hooks
- **HTTP Client**: Fetch API
- **Authentication**: JWT tokens via js-cookie

## Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Backend API running (see backend README)

### Installation

```bash
cd admin-web
npm install
```

### Configuration

Copy `.env.local.example` to `.env.local` and update the API URL:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, update to your production backend URL.

### Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The dashboard will be available at `http://localhost:3000`

## Project Structure

```
admin-web/
├── app/
│   ├── page.tsx                    # Login page
│   ├── page.module.css             # Login styles
│   ├── globals.css                 # Global styles
│   ├── layout.tsx                  # Root layout
│   └── dashboard/
│       ├── layout.tsx              # Dashboard layout with sidebar
│       ├── layout.module.css       # Dashboard layout styles
│       ├── page.tsx                # Dashboard home
│       ├── page.module.css         # Dashboard styles
│       ├── products.tsx            # Product review page
│       ├── products.module.css     # Product styles
│       ├── reports.tsx             # User reports page
│       ├── reports.module.css      # Reports styles
│       ├── users.tsx               # User management page
│       ├── users.module.css        # Users styles
│       ├── logs.tsx                # Moderation logs page
│       └── logs.module.css         # Logs styles
├── lib/
│   └── api.ts                      # API client utility
├── .env.local.example              # Environment variables template
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## API Integration

The dashboard expects the following backend endpoints:

### Authentication
- `POST /auth/login` - Admin login (returns access token)

### Dashboard
- `GET /admin/dashboard` - Dashboard statistics

### Products
- `GET /admin/items/pending?page=1&page_size=20` - List pending items
- `POST /admin/items/{id}/moderate` - Approve/reject item
- `DELETE /admin/items/{id}` - Delete item

### Reports
- `GET /admin/reports?page=1&page_size=20` - List all reports
- `GET /admin/reports?status=open` - List open reports
- `PATCH /admin/reports/{id}` - Resolve report

### Users
- `GET /admin/users?page=1&page_size=20` - List all users
- `GET /admin/users?suspended_only=true` - List suspended users
- `POST /admin/users/{id}/suspend` - Suspend user
- `POST /admin/users/{id}/unsuspend` - Restore user

### Logs
- `GET /admin/logs` - List moderation logs (placeholder)

## Authentication

Admin users must have `role = 'admin'` or `role = 'moderator'` in the database.

Login flow:
1. User enters email/password on login page
2. Backend validates and returns JWT token
3. Token stored in secure cookie via `js-cookie`
4. Token automatically attached to all API requests via `Authorization: Bearer <token>` header
5. Protected routes redirect unauthenticated users to login

## Styling

The dashboard uses CSS Modules for component-level styling with:
- CSS custom properties for theming (colors, spacing)
- BEM-inspired naming conventions
- Responsive design with mobile-first approach
- Dark-mode ready with CSS variables

## Development Notes

- All API calls include automatic JWT token authentication
- Moderation actions are logged server-side
- Pagination is implemented for all list views
- Modal dialogs for confirmations and detailed actions
- Error handling with user-friendly messages
- Loading states during data fetching

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
Update `.env.production` with your production backend URL:
```
NEXT_PUBLIC_API_URL=https://your-api.com
```

### Hosting Options
- Vercel (recommended, seamless Next.js integration)
- AWS Amplify
- Docker container
- Traditional static hosting + Node backend

## Security Considerations

- ✅ JWT tokens stored in httpOnly cookies (js-cookie)
- ✅ All API requests require valid token
- ✅ Server-side validation of admin role
- ✅ Admin actions logged for audit trail
- ✅ CORS configured on backend
- ✅ No sensitive data in local storage

## Troubleshooting

### Blank page or redirect to login
- Check API URL in `.env.local`
- Verify backend is running
- Check browser console for errors
- Clear cookies and try again

### API 401 Unauthorized
- Token may have expired
- Try logging out and back in
- Check backend is returning valid token

### CORS errors
- Ensure backend CORS middleware allows your frontend URL
- Check `allow_origins` in FastAPI setup

## Support

For issues or questions about the admin dashboard, check the main SwapStyl README or contact the development team.

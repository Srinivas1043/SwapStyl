# Admin System - Deployment Checklist

Complete this checklist before launching the admin system to production.

## Database Setup

- [ ] Apply migration: `DB/migration_admin_system.sql` to production Supabase
  - [ ] Verify tables created: `profiles`, `items`, `reports`, `moderation_log`
  - [ ] Verify columns added: `role`, `moderation_status`, `suspended_at`
  - [ ] Verify RLS policies enabled on `reports` and `moderation_log`
  - [ ] Test: Query `SELECT * FROM moderation_log` - should be empty or have audit entries

- [ ] Create admin users
  - [ ] For each admin: `UPDATE profiles SET role = 'admin' WHERE id = 'admin_id'`
  - [ ] Verify: `SELECT email, role FROM profiles WHERE role = 'admin'`
  - [ ] Create admin test account for testing

- [ ] Create moderation status rules
  - [ ] All new items start with `moderation_status = 'pending_review'`
  - [ ] Approved items get `moderation_status = 'approved'`
  - [ ] Rejected items get `moderation_status = 'rejected'`

## Backend Deployment

### Local Testing
- [ ] Run backend: `cd backend && python -m uvicorn main:app --reload`
- [ ] Test admin endpoints:
  ```bash
  curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:8000/admin/dashboard
  curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" http://localhost:8000/admin/items/pending
  ```
- [ ] All 10+ endpoints return valid JSON responses
- [ ] Error handling works: send invalid data, verify 400/403 responses

### Production Deployment
- [ ] Deploy backend to production server [SPECIFY LOCATION]
- [ ] Update database connection string (Supabase prod URL)
- [ ] Run migrations on production database
- [ ] Test all endpoints on production
- [ ] Set up error logging/monitoring (e.g., Sentry)

## Mobile Admin App Deployment

### Pre-Build
- [ ] Update API endpoint in `admin-mobile/context/AdminContext.tsx`
  - [ ] Change `API_URL` to production backend URL
  - [ ] Verify SSL certificate is valid
- [ ] Update app version in `admin-mobile/package.json`
- [ ] Test locally with production API
  - [ ] Login works
  - [ ] Dashboard loads stats
  - [ ] Can approve/reject items
  - [ ] Can resolve reports
  - [ ] Can suspend users

### TestFlight (iOS)
- [ ] Configure EAS: `eas build:list` to verify setup
- [ ] Build for TestFlight: `eas build --platform ios --auto-submit`
- [ ] Add testers in App Store Connect
- [ ] Share TestFlight link with admin team
- [ ] Testers verify all features on real devices

### Google Play (Android)
- [ ] Build for Play Store: `eas build --platform android`
- [ ] Create play.google.com app entry
- [ ] Upload APK/AAB to Play Store Console
- [ ] Add testers to beta track (requires Google account)
- [ ] Wait 1-2 hours for Play Console review
- [ ] Release to production after QA passes

### Production Release
- [ ] Set release date in App Store/Play Store
- [ ] Notify admins of new app version
- [ ] Monitor crash reports for first 24 hours
- [ ] Keep version 1 live for rollback capability

## Web Admin Dashboard Deployment

### Pre-Deploy
- [ ] Update environment variables
  - [ ] `NEXT_PUBLIC_API_URL` = production backend URL
  - [ ] SSL certificate valid
- [ ] Update Next.js config for production
- [ ] Build locally: `npm run build` - verify no errors
- [ ] Test on production build: `npm start`
  - [ ] Login page renders
  - [ ] Dashboard loads with real data
  - [ ] All pages respond within 2 seconds
  - [ ] Mobile browser works (admin sidebar collapses)

### Hosting Options

#### Option A: Vercel (Recommended)
```bash
npm install -g vercel
vercel login
vercel --prod
```
- [ ] Connect GitHub repo (optional)
- [ ] Set environment variables in Vercel dashboard
- [ ] Verify deployment URL works
- [ ] Set custom domain if applicable
- [ ] Enable analytics/monitoring

#### Option B: Self-Hosted (VPS/Docker)
```bash
npm run build
npm start
```
- [ ] Deploy to VPS (AWS/DigitalOcean/etc)
- [ ] Set up reverse proxy (Nginx/Apache)
- [ ] Configure SSL certificates (Let's Encrypt)
- [ ] Set up auto-restart on crash (PM2/systemd)
- [ ] Configure log rotation

#### Option C: Azure (if applicable)
- [ ] Deploy to Azure Static Web Apps
- [ ] Configure custom domain
- [ ] Enable authentication if using Entra ID

### Post-Deploy
- [ ] Verify URL is accessible
- [ ] Check SSL certificate (should be 🔒 green)
- [ ] Test login from public internet
- [ ] Monitor error logs for first 24 hours
- [ ] Share dashboard URL with admin team

## Admin Access Management

- [ ] Database populated with admin users
- [ ] Each admin can login with email/password
- [ ] Each admin action is logged in `moderation_log`
- [ ] Admin credentials are NOT shared via email
  - [ ] Use secure password manager (1Password/LastPass)
  - [ ] Share login links via secure channels only
- [ ] Backup admin account created (for emergency access)

## Security Hardening

- [ ] SSL/TLS enabled on all URLs (https://)
- [ ] CORS configured correctly (admin app only)
- [ ] API rate limiting enabled (prevent abuse)
- [ ] JWT tokens expire after 24 hours
- [ ] Admin endpoints validate authorization header
- [ ] Sensitive data not logged (passwords, tokens)
- [ ] IP whitelist for admin dashboard (optional)
- [ ] Access logs monitored regularly
- [ ] Database backups automated (daily minimum)

## Monitoring & Alerts

- [ ] Error tracking enabled (Sentry/DataDog/etc)
- [ ] Application performance monitoring (APM)
- [ ] Database connection pool monitored
- [ ] Disk usage alerts configured
- [ ] API response time alerts (threshold: 5 seconds)
- [ ] Error rate alerts (threshold: 1% of requests)
- [ ] Daily admin action report configured
- [ ] Suspicious activity alerts (mass deletions, etc)

## Team Training

- [ ] Admin team trained on dashboard usage
  - [ ] How to approve/reject items
  - [ ] How to handle reports
  - [ ] How to suspend users
  - [ ] How to view audit logs
- [ ] Documentation shared with admin team
- [ ] Emergency contact list updated
- [ ] Escalation procedures documented
- [ ] Support chat/channel created for admin questions

## User Communication

- [ ] Users notified about content moderation
- [ ] Rejection reasons shown to users
- [ ] Appeal process documented
- [ ] Suspension warning shown before permanent banning
- [ ] Suspension reason provided in notification

## Performance Baseline

Before going live, record baseline metrics:
- [ ] Dashboard loads in < 2 seconds
- [ ] Products list loads in < 3 seconds
- [ ] Report resolution completes in < 1 second
- [ ] User suspension completes in < 1 second
- [ ] Mobile app startup time < 5 seconds
- [ ] Mobile app battery drain < 5% per hour idle

## Backup & Disaster Recovery

- [ ] Database backups configured (hourly minimum)
- [ ] Backup tested (restore test annually)
- [ ] Code backups (GitHub or backup service)
- [ ] Admin API backup plan documented
- [ ] Rollback plan for bad deployment

## Go-Live Procedure

- [ ] All checklist items marked complete
- [ ] Team standby during launch (2 hours minimum)
- [ ] Monitoring dashboard open
- [ ] Backup admin account ready for emergencies
- [ ] **GO LIVE** ✅
- [ ] Monitor first hour closely
- [ ] Check admin login works
- [ ] Process test item approval/rejection
- [ ] Verify no errors appear in logs
- [ ] Send confirmation to team

## Post-Launch (First Week)

- [ ] Daily monitoring of error rates
- [ ] User feedback collection
- [ ] Admin team performance review
- [ ] Database query optimization if needed
- [ ] Security audit of all new endpoints
- [ ] Load testing at 10x normal traffic
- [ ] User appeal process testing
- [ ] Documentation updates based on feedback

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Backend Engineer | __________ | __________ | __________ |
| DevOps | __________ | __________ | __________ |
| Product Manager | __________ | __________ | __________ |
| Security | __________ | __________ | __________ |

**Launch Date: ___________**
**Launch Time: ___________**
**Timezone: ___________**

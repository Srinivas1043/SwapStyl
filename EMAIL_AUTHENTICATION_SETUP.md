# 📧 SwapStyl Email Authentication Setup Guide

This guide explains how to set up and configure email verification and password reset flows for SwapStyl.

## Overview

The email authentication system includes:
- ✅ **Email Verification on Signup** - Users receive a confirmation email
- ✅ **Forgot Password Flow** - Users can reset their password via email
- ✅ **Email Tracking** - Database tracks verification status and reset attempts
- ✅ **Rate Limiting** - Prevent abuse of resend/reset functions
- ✅ **Stable UX** - Clear messaging and recovery options

---

## Part 1: Supabase Configuration

### Step 1: Enable Email Verification

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Settings** → **Authentication** → **Providers**
3. Ensure **Email** provider is enabled
4. Go to **Settings** → **Authentication** → **Email**
5. Configure:
   - ✅ Enable **Email confirmations**
   - ✅ Set **Confirm email** expiry to **24 hours** (or your preference)
   - ✅ Enable **Allow multiple email addresses per user** (optional)

### Step 2: Configure Email Templates

Go to **Settings** → **Authentication** → **Email Templates**

#### Template 1: Confirm Signup (Verification Email)

**Template Name:** `Confirm signup`

**Subject:**
```
Verify your email to join SwapStyl
```

**HTML Body:**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1B4D2C 0%, #2D7A4A 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🌿 SwapStyl</h1>
    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Swap stylishly, sustainably</p>
  </div>

  <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
    <h2 style="color: #1B4D2C; margin: 0 0 16px 0; font-size: 22px;">Welcome to SwapStyl!</h2>
    
    <p style="color: #555; margin: 0 0 16px 0; line-height: 1.6;">
      Thank you for signing up. We need to verify your email address to complete your account setup.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #1B4D2C 0%, #2D7A4A 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>

    <p style="color: #888; font-size: 12px; margin: 20px 0 0 0; padding: 12px; background: #f5f5f5; border-radius: 6px; line-height: 1.5;">
      <strong>Link expires in 24 hours.</strong><br>
      If you didn't sign up for SwapStyl, please ignore this email.<br>
      <a href="{{ .SiteURL }}" style="color: #1B4D2C; text-decoration: none;">← Back to SwapStyl</a>
    </p>
  </div>
</div>
```

#### Template 2: Password Reset

**Template Name:** `Reset password`

**Subject:**
```
Reset your SwapStyl password
```

**HTML Body:**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1B4D2C 0%, #2D7A4A 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🔐 Password Reset</h1>
    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">SwapStyl</p>
  </div>

  <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
    <h2 style="color: #1B4D2C; margin: 0 0 16px 0; font-size: 22px;">Reset Your Password</h2>
    
    <p style="color: #555; margin: 0 0 16px 0; line-height: 1.6;">
      We received a request to reset the password for your SwapStyl account.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #D84315 0%, #E64A19 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>

    <p style="color: #888; font-size: 12px; margin: 20px 0 0 0; padding: 12px; background: #fff3e0; border-radius: 6px; border-left: 4px solid #D84315; line-height: 1.5;">
      <strong>⚠️ This link expires in 1 hour.</strong><br>
      If you didn't request a password reset, you can safely ignore this email.<br>
      Your account is secure as long as you don't share this link with anyone.
    </p>
  </div>
</div>
```

#### Template 3: Magic Link (Optional - for future passwordless login)

**Template Name:** `Magic Link`

**Subject:**
```
Your SwapStyl login link
```

**HTML Body:**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1B4D2C 0%, #2D7A4A 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🌿 SwapStyl</h1>
    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Sign in</p>
  </div>

  <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; border-left: 1px solid #e5e5e5; border-right: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
    <h2 style="color: #1B4D2C; margin: 0 0 16px 0; font-size: 22px;">Sign In to SwapStyl</h2>
    
    <p style="color: #555; margin: 0 0 16px 0; line-height: 1.6;">
      Click the link below to sign into your account:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: linear-gradient(135deg, #1B4D2C 0%, #2D7A4A 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
        Sign In Now
      </a>
    </div>

    <p style="color: #888; font-size: 12px; margin: 20px 0 0 0; padding: 12px; background: #f5f5f5; border-radius: 6px; line-height: 1.5;">
      <strong>This link expires in 15 minutes.</strong><br>
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</div>
```

### Step 3: Test Email Configuration

1. Go to **Settings** → **Authentication** → **Email**
2. Find the "Confirm signup" template
3. Click **"Preview"** to see how it looks
4. Click **"Test"** to send a test email to your address
5. Verify it arrives and looks correct

---

## Part 2: Database Setup

### Run the Migration

1. Go to **Supabase Dashboard** → SQL Editor
2. Create a new query
3. Copy and paste the contents of `DB/email_verification_migration.sql`
4. Click **"Run"**

This creates:
- ✅ `email_verified` column in `profiles` table
- ✅ `email_verified_at` timestamp
- ✅ `last_verification_email_sent` tracking
- ✅ `password_reset_attempts` table
- ✅ Automatic triggers to sync verification status
- ✅ Helper functions for tracking

### Verify the Creation

Run this query to confirm:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('email_verified', 'email_verified_at', 'last_verification_email_sent');
```

You should see 3 rows.

---

## Part 3: Frontend Implementation

The frontend now includes:

### 1. Enhanced Signup Flow (`app/(auth)/signup.tsx`)
- ✅ Email validation
- ✅ Verification status screen after signup
- ✅ Resend email button with 60-second cooldown
- ✅ Clear messaging about email checking

### 2. Forgot Password (`app/(auth)/login.tsx`)
- ✅ "Forgot Password?" link on login screen
- ✅ Email input form
- ✅ Rate limiting (60-second resend cooldown)
- ✅ Confirmation message

### 3. Password Reset Screen (`app/(auth)/reset-password.tsx`)
- ✅ New password input
- ✅ Password confirmation
- ✅ Success confirmation screen
- ✅ Clear password requirements

### 4. Email Utilities (`lib/email-auth.ts`)
- ✅ Helper functions for verification checks
- ✅ Resend email handler
- ✅ Password reset sender
- ✅ Email validation

---

## Part 4: Backend Implementation

### New Auth Endpoints (`routers/auth.py`)

Endpoints for email verification and password reset tracking:

1. **GET `/auth/email-verification/status`** - Check if email is verified
2. **POST `/auth/email-verification/resend`** - Resend verification email
3. **POST `/auth/password-reset/initiate`** - Send password reset email
4. **GET `/auth/password-reset/attempts`** - Check reset attempts
5. **POST `/auth/password-reset/complete`** - Mark reset as completed
6. **GET `/auth/health`** - Health check

### Rate Limiting

- **Verification email resend:** 60 seconds between attempts
- **Password reset:** Tracked in database, 5 attempts per 24 hours recommended (can be customized)

---

## Part 5: User Flow Diagrams

### Signup Flow
```
User enters email & password
        ↓
Validation check
        ↓
Create account in Supabase Auth
        ↓
Supabase sends verification email
        ↓
Show "Check your email" screen
        ↓
User clicks link in email
        ↓
Email verified in auth.users
        ↓
Trigger syncs to profiles table
        ↓
User can now login
```

### Forgot Password Flow
```
User clicks "Forgot Password?"
        ↓
Enter email address
        ↓
Request password reset
        ↓
Supabase sends reset link
        ↓
Show confirmation screen
        ↓
User clicks link in email
        ↓
Redirected to reset-password screen
        ↓
Enter new password
        ↓
Password updated in auth.users
        ↓
Success screen
        ↓
Redirect to login
```

---

## Part 6: Testing Checklist

- [ ] **Signup:**
  - [ ] Create account with email
  - [ ] Receive verification email
  - [ ] Click link in email
  - [ ] Email marked as verified
  - [ ] Can login after verification

- [ ] **Forgot Password:**
  - [ ] Click "Forgot Password?" on login
  - [ ] Enter email
  - [ ] Receive reset email
  - [ ] Click link
  - [ ] Enter new password
  - [ ] Successfully login with new password

- [ ] **Rate Limiting:**
  - [ ] Try to resend verification email immediately → should see "wait 60s" message
  - [ ] Wait 60s, then resend should work
  - [ ] Password reset attempts tracked in database

- [ ] **Edge Cases:**
  - [ ] Try invalid email format → validation error shown
  - [ ] Try mismatched passwords → error shown
  - [ ] Try password < 6 characters → error shown
  - [ ] Sign up with existing email → appropriate error from Supabase

---

## Part 7: Environment Variables

Ensure you have these in `.env`:

```bash
# .env (Backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

```bash
# .env.local (Frontend - in Expo)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Part 8: Troubleshooting

### Problem: "Email not sent" errors
**Solution:**
1. Check Supabase email provider is configured
2. Verify email templates are set up
3. Check backend logs for errors
4. Confirm SMTP settings in Supabase (if using custom SMTP)

### Problem: "User not found" on password reset
**Solution:**
1. Verify user exists in Supabase
2. Check email is correct (case-sensitive for some systems)
3. For security, frontend shows "email sent" regardless

### Problem: Verification link not working
**Solution:**
1. Ensure redirect URL is correct
2. Check link hasn't expired (24 hours default)
3. Verify email was sent from correct domain
4. Test with test account first

### Problem: Cannot login after email verified
**Solution:**
1. Check `email_verified_at` is set in profiles
2. Verify `email_confirmed_at` is set in auth.users
3. Check RLS policies on profiles table
4. Make sure checkProfileAndRedirect() in login checks email_verified

---

## Part 9: Security Best Practices

1. ✅ **Always use HTTPS** for email links
2. ✅ **Never reveal if email exists** - show same message for found/not found
3. ✅ **Rate limit password resets** - prevent enumeration attacks
4. ✅ **Expire links quickly** - 24h for signup, 1h for password reset
5. ✅ **Use secure tokens** - Supabase handles this automatically
6. ✅ **Require email verification** - prevent spam signups
7. ✅ **Log authentication events** - helps detect suspicious activity

---

## Part 10: Next Steps

1. ✅ Run the database migration
2. ✅ Configure Supabase email templates
3. ✅ Test signup flow end-to-end
4. ✅ Test forgot password flow
5. ✅ Deploy to Render backend
6. ✅ Build and test frontend APK
7. ✅ Monitor email delivery rates
8. ✅ Collect user feedback on UX

---

## Support

If users have issues:
- **Can't receive emails?** Check spam folder
- **Link expired?** Resend the email (60-second cooldown respected)
- **Forgot email?** They'll need to use signup again
- **Account locked?** No lockout by design, but rate limiting prevents brute force

---

**Last Updated:** February 2026
**Version:** 1.0.0

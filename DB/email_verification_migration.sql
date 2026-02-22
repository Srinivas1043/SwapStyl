-- ─────────────────────────────────────────────────────────────────
-- EMAIL VERIFICATION & PASSWORD RESET SCHEMA
-- Run this migration in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Track email verification status in profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_verification_email_sent timestamp with time zone;

-- Create a table to track password reset attempts (optional security measure)
-- Supabase handles token generation, we just track rate limiting
CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  email text not null,
  requested_at timestamp with time zone default timezone('utc', now()) not null,
  reset_completed_at timestamp with time zone,
  ip_address text  -- for security/audit purposes
);

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own reset attempts
CREATE POLICY "Users view own password reset attempts" ON public.password_reset_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Allow inserts for tracking
CREATE POLICY "Insert password reset attempts" ON public.password_reset_attempts
  FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_user ON public.password_reset_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_attempts_email ON public.password_reset_attempts(email, requested_at DESC);

-- Trigger: Auto-update email_verified when auth.users.email_confirmed_at changes
-- This runs on every auth event from Supabase
CREATE OR REPLACE FUNCTION on_auth_user_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    email_verified_at = NEW.email_confirmed_at
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- This trigger fires whenever auth.users changes (including email confirmation)
DROP TRIGGER IF EXISTS on_auth_user_changes ON auth.users;
CREATE TRIGGER on_auth_user_changes
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_updated();

-- Trigger: Set email_verified to true when a new verified user is created
-- (for any users who create account with email verification)
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    email_verified_at = NEW.email_confirmed_at
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_creation ON auth.users;
CREATE TRIGGER on_auth_user_creation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();

-- ─────────────────────────────────────────────────────────────────
-- SUPABASE EMAIL TEMPLATES CONFIGURATION
-- ─────────────────────────────────────────────────────────────────
-- Go to Supabase Dashboard > Project Settings > Auth > Email Templates
-- Set up the following templates:

-- 1. CONFIRMATION EMAIL (Sign Up Verification)
-- Template Name: "Confirm signup"
-- Use this HTML template to replace the default:
/*
<h2>Verify your email to complete registration</h2>
<p>Welcome to SwapStyl! 🌿</p>
<p>We need to confirm your email address to complete your account setup.</p>
<p style="margin-top: 20px;">
  <a href="{{ .ConfirmationURL }}" style="background-color: #1B4D2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
    Verify Email Address
  </a>
</p>
<p style="font-size: 14px; color: #666; margin-top: 20px;">
  Link expires in 24 hours. If you didn't sign up, please ignore this email.
</p>
*/

-- 2. MAGIC LINK (Sign In - Optional)
-- Use this for future passwordless login
/*
<h2>Your login link for SwapStyl</h2>
<p>Click the link below to sign in to your account:</p>
<p style="margin-top: 20px;">
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink" style="background-color: #1B4D2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
    Sign In to SwapStyl
  </a>
</p>
*/

-- 3. PASSWORD RECOVERY EMAIL
-- Template Name: "Password reset"
-- Use this HTML template:
/*
<h2>Reset your SwapStyl password</h2>
<p>We received a request to reset the password for your account.</p>
<p style="margin-top: 20px;">
  <a href="{{ .ConfirmationURL }}" style="background-color: #1B4D2C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
    Reset Password
  </a>
</p>
<p style="font-size: 14px; color: #666; margin-top: 20px;">
  This link expires in 1 hour.<br>
  If you didn't request a password reset, you can safely ignore this email.
</p>
*/

-- 4. INVITE EMAIL (Future use for referrals)
-- Information for future reference but not implemented yet

-- ─────────────────────────────────────────────────────────────────
-- VERIFICATION STATUS HELPERS
-- ─────────────────────────────────────────────────────────────────

-- Helper function to get user email verification status
CREATE OR REPLACE FUNCTION get_email_verification_status(user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'verified', COALESCE(email_verified, false),
    'verified_at', email_verified_at,
    'last_email_sent', last_verification_email_sent
  )
  FROM public.profiles
  WHERE id = user_id;
$$;

-- Helper function to log a password reset attempt
CREATE OR REPLACE FUNCTION log_password_reset_attempt(user_id uuid, user_email text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.password_reset_attempts (user_id, email)
  VALUES (user_id, user_email)
  RETURNING jsonb_build_object(
    'tracked', true,
    'timestamp', requested_at
  );
$$;

-- Helper to mark reset as completed
CREATE OR REPLACE FUNCTION mark_password_reset_completed(user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.password_reset_attempts
  SET reset_completed_at = timezone('utc'::text, now())
  WHERE user_id = user_id AND reset_completed_at IS NULL
  ORDER BY requested_at DESC
  LIMIT 1
  RETURNING jsonb_build_object(
    'completed', true,
    'timestamp', reset_completed_at
  );
$$;

-- ─────────────────────────────────────────────────────────────────
-- ROLLBACK COMMANDS (if needed)
-- ─────────────────────────────────────────────────────────────────
/*
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verified;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_verification_email_sent;
DROP TABLE IF EXISTS public.password_reset_attempts;
*/

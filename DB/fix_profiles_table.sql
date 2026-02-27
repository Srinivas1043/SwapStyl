-- FIX: Profiles Table - Add Admin Fields Only
-- This migration adds admin-specific fields to profiles table
-- NOTE: Email comes from auth.users via joins, NOT from profiles

-- ==================== STEP 1: Add Admin Columns ====================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS role_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended_at);

-- ==================== STEP 2: Create Auto-Population Trigger ====================
-- This trigger automatically creates a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
    -- Generate default username from email
    INSERT INTO public.profiles (id, username, created_at)
    VALUES (
      new.id, 
      COALESCE(
        new.raw_user_meta_data->>'full_name',
        SPLIT_PART(new.email, '@', 1)
      ),
      timezone('utc'::text, now())
    );
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== STEP 3: Setup RLS Policies for Admin ====================
-- Admin policies: Access control based on role in profiles

-- Drop existing conflicting policies (handles re-runs)
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile v2" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- Admin can update profiles (to set role, suspend, etc.)
CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- User can still update own profile
CREATE POLICY "Users can update own profile v2"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ==================== STEP 5: Create View for Admin User Management ====================
-- This view joins auth.users with profiles to provide complete user info including email
-- NOTE: Email is stored in auth.users, not in profiles table
DROP VIEW IF EXISTS public.admin_users_view CASCADE;

CREATE VIEW public.admin_users_view AS
SELECT 
  p.id,
  p.full_name,
  p.username,
  p.avatar_url,
  u.email,
  p.role,
  p.created_at,
  p.suspended_at,
  p.suspension_reason
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id;

-- Grant access to view
ALTER VIEW public.admin_users_view OWNER TO postgres;
-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('item', 'user')),
  reported_item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  action_taken TEXT,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id)
);

-- Moderation log for audit trail
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id uuid NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('item', 'user', 'report')),
  target_id uuid NOT NULL,
  reason TEXT,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Add moderation fields to items if not present
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'auto_approved' CHECK (moderation_status IN ('auto_approved', 'pending_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;

-- RLS policies - Drop existing ones first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Only admins can view moderation log" ON public.moderation_log;

CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')));

CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')));

CREATE POLICY "Only admins can view moderation log" ON public.moderation_log
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_moderation_status ON public.items(moderation_status);
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON public.items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended_at);

-- ==================== VERIFICATION QUERIES ====================
-- Run these to verify the migration worked

-- Check columns were added
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name IN ('role', 'suspended_at', 'suspension_reason')
-- ORDER BY column_name;

-- Check tables created
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('reports', 'moderation_log');

-- Check trigger exists
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE event_object_table = 'users' AND trigger_schema = 'auth';


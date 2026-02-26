-- ─────────────────────────────────────────────────────────────────
-- ADMIN SYSTEM SCHEMA MIGRATION
-- Run this migration in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Add role column for admin/moderator access control
-- Use TEXT instead of ENUM for flexibility
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS role_updated_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient role filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Add RLS policy for admins to view all users
-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')
    )
  );

-- Admins can update user roles
CREATE POLICY "Admins can update user roles"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')
    )
  );

-- Log table for admin actions (optional but recommended)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES public.profiles(id),
  details jsonb DEFAULT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view logs
CREATE POLICY "Admins can view admin logs"
  ON public.admin_logs FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role IN ('admin', 'moderator')
    )
  );

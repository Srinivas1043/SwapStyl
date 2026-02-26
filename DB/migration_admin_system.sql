-- Migration: Admin System, Product Moderation, and User Reporting

-- 1. Add admin role to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- 2. Add moderation fields to items
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'auto_approved' CHECK (moderation_status IN ('auto_approved', 'pending_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- 3. Create reports/flags table for user-reported items
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

-- 4. Create moderation_log for audit trail
CREATE TABLE IF NOT EXISTS public.moderation_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id uuid NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('approve', 'reject', 'delete', 'flag_resolved', 'user_suspended')),
  target_type TEXT NOT NULL CHECK (target_type IN ('item', 'user', 'report')),
  target_id uuid NOT NULL,
  reason TEXT,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- 5. Add suspension status to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- 6. RLS Policies for Admin
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR role = 'moderator'));
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR role = 'moderator'));

ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view moderation log" ON public.moderation_log
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- 7. Create index for moderation queries
CREATE INDEX IF NOT EXISTS idx_items_moderation_status ON public.items(moderation_status);
CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON public.items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended_at);

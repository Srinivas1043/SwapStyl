-- FIX: Profiles Table Setup and Auto-Creation
-- This migration fixes the profile creation issues

-- ==================== STEP 1: Add Missing Columns ====================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS role_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON public.profiles(suspended_at);

-- ==================== STEP 2: Update Null Rows with Email ====================
-- For existing profiles with NULL email, fetch from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- ==================== STEP 3: Create Auto-Population Trigger ====================
-- This trigger automatically creates a profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new.id) THEN
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (new.id, new.email, timezone('utc'::text, now()));
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

-- ==================== STEP 4: Setup RLS Policies ====================
-- Admin policies
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'moderator')
    )
  );

-- User can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Drop conflicting policies if they exist
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;

-- ==================== STEP 5: Populate Missing Data ====================
-- Clean up any completely empty rows by giving them default values
UPDATE public.profiles
SET username = CONCAT('user_', SUBSTRING(id::text, 1, 8))
WHERE username IS NULL;

UPDATE public.profiles
SET full_name = 'New User'
WHERE full_name IS NULL;

UPDATE public.profiles
SET created_at = NOW()
WHERE created_at IS NULL;

-- ==================== VERIFICATION QUERIES ====================
-- Run these to verify the migration worked:

-- Check column count (should have all columns including role, email, etc.)
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' ORDER BY ordinal_position;

-- Check for null emails (should be 0 after migration)
-- SELECT COUNT(*) as null_emails FROM public.profiles WHERE email IS NULL;

-- Check all users have profiles
-- SELECT COUNT(DISTINCT u.id) as auth_users, COUNT(DISTINCT p.id) as profile_users 
-- FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id;

-- Check trigger is working (should be present)
-- SELECT trigger_name FROM information_schema.triggers 
-- WHERE event_object_table = 'users' AND trigger_schema = 'auth';

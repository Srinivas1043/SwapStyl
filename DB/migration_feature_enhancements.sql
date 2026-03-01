-- ============================================================
-- SwapStyl Feature Enhancements — Database Migration
-- Run these in your Supabase SQL Editor in order.
-- ============================================================

-- Feature 1: Account Soft-Delete with 14-Day Grace Period
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

-- Feature 3: User Verification Badge
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Feature 4: Product Verification Badge
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ============================================================
-- Optional: Index for admin queries on pending deletions
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_scheduled_deletion
  ON profiles (scheduled_deletion_at)
  WHERE scheduled_deletion_at IS NOT NULL AND is_active = false;

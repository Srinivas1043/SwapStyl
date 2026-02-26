-- ═══════════════════════════════════════════════════════════════
-- SwapStyl — Eco Points migration
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add eco_points column (replaces old `points` concept)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eco_points integer DEFAULT 0;

-- 2. Backfill: if you had a `points` column, copy over (safe no-op otherwise)
-- UPDATE public.profiles SET eco_points = COALESCE(points, 0) WHERE eco_points = 0;

-- 3. Add conversations columns needed for deal flow (safe if already exist)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS deal_agreed_by uuid[] DEFAULT '{}';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS deal_agreed_at timestamptz;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS completed_by uuid[] DEFAULT '{}';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS cancelled_by uuid;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at timestamptz DEFAULT now();
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_user1 integer DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_user2 integer DEFAULT 0;

-- 4. Add latitude/longitude to profiles for geo-distance filtering
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;

-- 5. Add ai_score / gender to items (safe)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_score numeric(5,2) DEFAULT 0;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS gender text;

-- 6. Add read_at / type / metadata to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 7. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reviewer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reviewee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    conversation_id uuid REFERENCES public.conversations(id),
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(reviewer_id, conversation_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;
CREATE POLICY "Users can insert own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- 8. RLS for items update/delete (owner only)
DROP POLICY IF EXISTS "Owners can update their items" ON public.items;
CREATE POLICY "Owners can update their items" ON public.items FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can delete their items" ON public.items;
CREATE POLICY "Owners can delete their items" ON public.items FOR DELETE USING (auth.uid() = owner_id);

-- 9. RLS for conversations (participants only)
DROP POLICY IF EXISTS "Conversation participants can view" ON public.conversations;
CREATE POLICY "Conversation participants can view" ON public.conversations FOR SELECT
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations FOR UPDATE
    USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 10. RLS for messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
              AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        )
    );
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.messages;
CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- 11. RLS for swipes
DROP POLICY IF EXISTS "Users can manage their swipes" ON public.swipes;
CREATE POLICY "Users can manage their swipes" ON public.swipes
    USING (auth.uid() = swiper_id)
    WITH CHECK (auth.uid() = swiper_id);

-- 12. Force schema cache reload
NOTIFY pgrst, 'reload schema';

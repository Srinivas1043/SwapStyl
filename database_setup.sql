-- Run this entirely in your Supabase SQL Editor

-- 1. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    reviewer_id uuid REFERENCES public.profiles(id) NOT NULL,
    reviewee_id uuid REFERENCES public.profiles(id) NOT NULL,
    conversation_id uuid REFERENCES public.conversations(id) NOT NULL,
    rating int CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(reviewer_id, conversation_id)
);

-- RLS Policies for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
CREATE POLICY "Authenticated users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);


-- 2. Points System
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points int DEFAULT 0;

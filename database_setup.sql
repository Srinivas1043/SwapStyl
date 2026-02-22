-- Run this entirely in your Supabase SQL Editor

-- 1. Create Wishlists Table
CREATE TABLE IF NOT EXISTS public.wishlists (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, item_id)
);

-- RLS for Wishlists
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own wishlists" ON public.wishlists;
CREATE POLICY "Users can manage their own wishlists" ON public.wishlists 
    USING (auth.uid() = user_id);

-- 2. Force Reload Schema Cache (Fixes the "table not in schema cache" and missing Points column bugs)
NOTIFY pgrst, 'reload schema';

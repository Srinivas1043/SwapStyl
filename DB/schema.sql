-- Enable RLS
alter table auth.users enable row level security;

-- PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  phone text,
  gender text,
  rating numeric(3,1) default 0.0,
  items_swapped integer default 0,
  items_listed integer default 0,
  wishlist_count integer default 0,
  onboarding_completed_at timestamp with time zone,
  preferences jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- ITEMS
create table public.items (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  brand text,
  size text,
  color text,
  condition text,
  category text,
  gender text,
  estimated_value numeric(10,2),
  images text[] default array[]::text[],
  status text default 'available', -- available, pending_review, swapped, rejected
  ai_verified boolean default false,
  ai_score numeric(5,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Run this if table already exists to add missing columns:
-- ALTER TABLE public.items ADD COLUMN IF NOT EXISTS gender text;
-- ALTER TABLE public.items ADD COLUMN IF NOT EXISTS estimated_value numeric(10,2);
-- ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ai_score numeric(5,2) default 0;

alter table public.items enable row level security;

create policy "Items are viewable by everyone."
  on public.items for select
  using ( true );

create policy "Users can insert their own items."
  on public.items for insert
  with check ( auth.uid() = owner_id );

-- SWIPES
create table public.swipes (
  id uuid default uuid_generate_v4() primary key,
  swiper_id uuid references public.profiles(id) not null,
  item_id uuid references public.items(id) not null,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(swiper_id, item_id)
);

alter table public.swipes enable row level security;
-- TODO: Security policies for swipes

-- MATCHES (Optional: can be derived from mutual right swipes)
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  user1_id uuid references public.profiles(id) not null,
  user2_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.matches enable row level security;

-- DEALS
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches(id),
  status text default 'pending', -- pending, confirmed, declined, completed
  meetup_location text,
  meetup_time timestamp,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.deals enable row level security;

-- MESSAGES
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id),
  sender_id uuid references public.profiles(id),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

-- ─────────────────────────────────────────────────────────────────
-- SWAP FEATURE ADDITIONS — run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- GPS coords on profiles for radius filter
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- WISHLISTS
CREATE TABLE IF NOT EXISTS public.wishlists (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  item_id    uuid references public.items(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  unique(user_id, item_id)
);
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.wishlists
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id         uuid default uuid_generate_v4() primary key,
  user1_id   uuid references public.profiles(id) not null,
  user2_id   uuid references public.profiles(id) not null,
  item_id    uuid references public.items(id),
  created_at timestamp with time zone default timezone('utc', now()) not null,
  unique(user1_id, user2_id, item_id)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view conversation" ON public.conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "Participants can insert conversation" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Link messages to conversations
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid references public.conversations(id);

-- RLS for swipes
CREATE POLICY "Users insert own swipes" ON public.swipes
  FOR INSERT WITH CHECK (auth.uid() = swiper_id);
CREATE POLICY "Users view own swipes" ON public.swipes
  FOR SELECT USING (auth.uid() = swiper_id);

-- Messages RLS
CREATE POLICY "Participants can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Participants can read messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Helper functions for wishlist_count on profile
CREATE OR REPLACE FUNCTION increment_wishlist_count(uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles SET wishlist_count = COALESCE(wishlist_count,0)+1 WHERE id = uid;
$$;

CREATE OR REPLACE FUNCTION decrement_wishlist_count(uid uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles SET wishlist_count = GREATEST(COALESCE(wishlist_count,0)-1,0) WHERE id = uid;
$$;

-- ─────────────────────────────────────────────────────────────────
-- CHAT & DEAL FEATURE — run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Enrich conversations with deal tracking
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'interested',        -- interested|negotiating|deal_agreed|completed|cancelled
  ADD COLUMN IF NOT EXISTS deal_agreed_by uuid[] DEFAULT '{}',      -- array of user IDs who clicked Agree
  ADD COLUMN IF NOT EXISTS completed_by uuid[] DEFAULT '{}',        -- array of user IDs who clicked Swapped
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,                       -- who cancelled
  ADD COLUMN IF NOT EXISTS deal_agreed_at timestamp with time zone, -- when both agreed
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,   -- when both marked swapped
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS unread_user1 integer DEFAULT 0,          -- unread count for user1
  ADD COLUMN IF NOT EXISTS unread_user2 integer DEFAULT 0;          -- unread count for user2

-- Allow participants to update conversation (status, agree arrays)
CREATE POLICY IF NOT EXISTS "Participants can update conversation" ON public.conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Enrich messages with type, metadata, read receipt, soft-delete
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'text',                -- text|system|item_proposal|deal_event
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',            -- { item_id, item_title, item_image, item_brand, item_size }
  ADD COLUMN IF NOT EXISTS read_at timestamp with time zone,       -- when the OTHER participant first read it
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;        -- soft delete (shows "Message removed")

-- Allow participants to update messages (mark read)
CREATE POLICY IF NOT EXISTS "Participants can update messages" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- Index for fast conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- Trigger: auto-update last_message_at + unread counts when a message is inserted
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  conv public.conversations%ROWTYPE;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;

  -- Advance status from 'interested' to 'negotiating' on first real reply
  IF conv.status = 'interested' AND NEW.type = 'text' AND NEW.sender_id != (
    SELECT swiper_id FROM public.swipes WHERE item_id = conv.item_id AND direction = 'right' LIMIT 1
  ) THEN
    UPDATE public.conversations SET status = 'negotiating' WHERE id = NEW.conversation_id;
  END IF;

  -- Update last_message_at and unread counts
  IF NEW.sender_id = conv.user1_id THEN
    UPDATE public.conversations
      SET last_message_at = NEW.created_at,
          unread_user2 = unread_user2 + 1
      WHERE id = NEW.conversation_id;
  ELSE
    UPDATE public.conversations
      SET last_message_at = NEW.created_at,
          unread_user1 = unread_user1 + 1
      WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

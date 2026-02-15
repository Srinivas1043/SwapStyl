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
  images text[] default array[]::text[],
  status text default 'available', -- available, swapped, reserved
  ai_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

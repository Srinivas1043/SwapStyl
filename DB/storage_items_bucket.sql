-- Enable the storage extension if not already enabled (usually enabled by default in Supabase)
-- create extension if not exists "storage";

-- 1. Create the 'item-images' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do update set public = true;

-- 2. Enable RLS on the bucket (optional but good practice, though public buckets read is open)
-- alter table storage.objects enable row level security;

-- 3. Policy: ALLOW READ (Public)
-- Anyone can view item images
create policy "Public Access Item Images"
on storage.objects for select
using ( bucket_id = 'item-images' );

-- 4. Policy: ALLOW UPLOAD (Authenticated Users)
-- Authenticated users can upload images to their own folder, or just any folder for now (simplification)
-- Ideally: folder name should match user_id
create policy "Authenticated Users Upload Item Images"
on storage.objects for insert
with check (
  bucket_id = 'item-images'
  and auth.role() = 'authenticated'
);

-- 5. Policy: ALLOW UPDATE/DELETE (Owners Only)
create policy "Users Can Update Own Item Images"
on storage.objects for update
using (
  bucket_id = 'item-images'
  and auth.uid() = owner
);

create policy "Users Can Delete Own Item Images"
on storage.objects for delete
using (
  bucket_id = 'item-images'
  and auth.uid() = owner
);

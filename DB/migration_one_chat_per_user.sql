-- Migration: Enforce one conversation per user pair (not per item)
-- This ensures users communicate in a single chat regardless of items discussed

-- 1. Identify duplicate conversations (keeping the oldest one per user pair)
WITH oldest_per_pair AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY 
      LEAST(user1_id, user2_id), 
      GREATEST(user1_id, user2_id) 
      ORDER BY created_at ASC) as rn
  FROM public.conversations
),
duplicates_to_delete AS (
  SELECT id FROM oldest_per_pair WHERE rn > 1
)
-- 2. Delete reviews from duplicate conversations first
DELETE FROM public.reviews 
WHERE conversation_id IN (SELECT id FROM duplicates_to_delete);

-- 3. Delete messages from duplicate conversations
WITH oldest_per_pair AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY 
      LEAST(user1_id, user2_id), 
      GREATEST(user1_id, user2_id) 
      ORDER BY created_at ASC) as rn
  FROM public.conversations
),
duplicates_to_delete AS (
  SELECT id FROM oldest_per_pair WHERE rn > 1
)
DELETE FROM public.messages 
WHERE conversation_id IN (SELECT id FROM duplicates_to_delete);

-- 4. Now delete the duplicate conversations
WITH oldest_per_pair AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY 
      LEAST(user1_id, user2_id), 
      GREATEST(user1_id, user2_id) 
      ORDER BY created_at ASC) as rn
  FROM public.conversations
)
DELETE FROM public.conversations 
WHERE id IN (
  SELECT id FROM oldest_per_pair WHERE rn > 1
);

-- 5. Drop the old unique constraint on (user1_id, user2_id, item_id)
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_user1_id_user2_id_item_id_key;

-- 6. Add new unique constraint on just (user1_id, user2_id)
-- This ensures only one conversation exists per user pair
ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_user_pair_unique UNIQUE (user1_id, user2_id);

-- 7. Make item_id nullable since item info is now stored in message metadata
ALTER TABLE public.conversations 
ALTER COLUMN item_id DROP NOT NULL;




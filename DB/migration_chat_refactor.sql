-- Migration to make conversations user-based instead of item-based
-- 1. Drop the unique constraint on (user1_id, user2_id, item_id)
-- 2. Add a unique constraint on (user1_id, user2_id) - user1 < user2 enforced by application logic usually, but here we might need function-based index or just assume app handles order.
-- However, we have existing data. We need to handle duplicates (multiple chats for same pair).
-- For now, we will relax the constraint and logical code changes will ensure reuse.

-- Drop old unique index
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user1_id_user2_id_item_id_key;

-- Make item_id nullable if it's not already
ALTER TABLE public.conversations ALTER COLUMN item_id DROP NOT NULL;

-- Create an index for looking up conversations by participants
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(user1_id, user2_id);

-- Ideally we would merge duplicates, but for this migration let's just allow the code to pick the 'latest' one or create new ones more carefully.

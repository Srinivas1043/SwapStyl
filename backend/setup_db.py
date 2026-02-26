import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
tables = cur.fetchall()
with open("tables.txt", "w") as f:
    for t in tables:
        f.write(t[0] + "\n")
print("Wrote tables.txt")

# 1. Realtime Publication
try:
    # First, try to create the publication if it doesn't exist
    cur.execute("CREATE PUBLICATION supabase_realtime FOR TABLE public.messages, public.conversations;")
    print("Created supabase_realtime publication")
except psycopg2.errors.DuplicateObject:
    conn.rollback()
    # If it already existed, just add the tables
    try:
        cur.execute("ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;")
    except Exception as e:
        conn.rollback()
    try:
        cur.execute("ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;")
    except Exception as e:
        conn.rollback()
except Exception as e:
    conn.rollback()
    print("Error creating publication:", e)

# 2. Reviews Table
cur.execute("""
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
""")

cur.execute("ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;")
cur.execute("DROP POLICY IF EXISTS \"Anyone can read reviews\" ON public.reviews;")
cur.execute("CREATE POLICY \"Anyone can read reviews\" ON public.reviews FOR SELECT USING (true);")

cur.execute("DROP POLICY IF EXISTS \"Authenticated users can insert reviews\" ON public.reviews;")
cur.execute("CREATE POLICY \"Authenticated users can insert reviews\" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);")

# 3. Points System
cur.execute("ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points int DEFAULT 0;")

conn.commit()
print('DB schema successfully updated!')

cur.close()
conn.close()

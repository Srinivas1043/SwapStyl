-- Create a storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat', 'chat', true);

-- Policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat');

-- Policy to allow anyone to view images (since they are public URLs in chat)
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat');

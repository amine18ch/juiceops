-- Migration: Create storage bucket for reception photos
-- Idempotent: safe to run multiple times

-- Add photo_url column to receptions table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'receptions'
      AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.receptions ADD COLUMN photo_url TEXT DEFAULT NULL;
  END IF;
END $$;

-- Create storage bucket for reception photos (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reception-photos',
  'reception-photos',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: authenticated users can upload photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'reception_photos_insert'
  ) THEN
    CREATE POLICY "reception_photos_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'reception-photos');
  END IF;
END $$;

-- RLS policy: authenticated users can read photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'reception_photos_select'
  ) THEN
    CREATE POLICY "reception_photos_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'reception-photos');
  END IF;
END $$;

-- RLS policy: public read access for photo URLs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'reception_photos_public_read'
  ) THEN
    CREATE POLICY "reception_photos_public_read"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (bucket_id = 'reception-photos');
  END IF;
END $$;

-- Fix user_biometrics table column name
-- Run this in Supabase Dashboard SQL Editor if you already ran the initial migration
-- This fixes the column name from 'face_image' to 'face_image_url' to match the code

-- Check if face_image column exists and rename it to face_image_url
DO $$
BEGIN
    -- Check if the old column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_biometrics' 
        AND column_name = 'face_image'
    ) THEN
        -- Rename the column
        ALTER TABLE public.user_biometrics 
        RENAME COLUMN face_image TO face_image_url;
        
        -- Make it nullable to match the types
        ALTER TABLE public.user_biometrics 
        ALTER COLUMN face_image_url DROP NOT NULL;
    END IF;
    
    -- If face_image_url doesn't exist at all, create it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_biometrics' 
        AND column_name = 'face_image_url'
    ) THEN
        ALTER TABLE public.user_biometrics 
        ADD COLUMN face_image_url TEXT;
    END IF;
END $$;


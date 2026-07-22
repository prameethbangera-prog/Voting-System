-- Add results_access_offset_minutes column to elections table
-- Run this in Supabase Dashboard SQL Editor
-- This allows configuring when results become accessible (before or after end time)

ALTER TABLE IF EXISTS public.elections 
ADD COLUMN IF NOT EXISTS results_access_offset_minutes INTEGER DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.elections.results_access_offset_minutes IS 
'Offset in minutes from end_date when results become accessible. Negative values mean before end time, positive values mean after end time. Default is 0 (results available immediately after end time).';


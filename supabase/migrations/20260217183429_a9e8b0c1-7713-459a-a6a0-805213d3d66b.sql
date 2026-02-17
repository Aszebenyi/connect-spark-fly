
-- Add replied_at to email_log for reply tracking
ALTER TABLE public.email_log ADD COLUMN IF NOT EXISTS replied_at timestamptz;

-- Add email_preferences jsonb to profiles for digest opt-out
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{"digest": true}'::jsonb;

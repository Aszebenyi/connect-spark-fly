ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_signature text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS include_signature boolean DEFAULT true;
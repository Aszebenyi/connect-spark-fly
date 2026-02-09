
-- Create user_company_profiles table to store per-user product identity for AI outreach
CREATE TABLE public.user_company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_website TEXT,
  company_name TEXT NOT NULL DEFAULT '',
  what_you_do TEXT NOT NULL DEFAULT '',
  target_candidates TEXT NOT NULL DEFAULT '',
  value_proposition TEXT NOT NULL DEFAULT '',
  key_benefits TEXT DEFAULT '',
  communication_tone TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_company_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own company profile"
  ON public.user_company_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own profile
CREATE POLICY "Users can create own company profile"
  ON public.user_company_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own company profile"
  ON public.user_company_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all company profiles"
  ON public.user_company_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_user_company_profiles_updated_at
  BEFORE UPDATE ON public.user_company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

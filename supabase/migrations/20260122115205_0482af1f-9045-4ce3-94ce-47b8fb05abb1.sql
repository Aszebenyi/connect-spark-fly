-- Create lead_magnet_submissions table for capturing email leads
CREATE TABLE public.lead_magnet_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    magnet_type text NOT NULL DEFAULT 'free_leads',
    input_data jsonb,
    output_data jsonb,
    ip_address text,
    converted_to_user boolean DEFAULT false,
    user_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_magnet_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for anonymous visitors)
CREATE POLICY "Anyone can submit lead magnet forms"
ON public.lead_magnet_submissions
FOR INSERT
WITH CHECK (true);

-- Admins can view all submissions
CREATE POLICY "Admins can view all lead magnet submissions"
ON public.lead_magnet_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update submissions (mark as converted, etc.)
CREATE POLICY "Admins can update lead magnet submissions"
ON public.lead_magnet_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_lead_magnet_submissions_updated_at
BEFORE UPDATE ON public.lead_magnet_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
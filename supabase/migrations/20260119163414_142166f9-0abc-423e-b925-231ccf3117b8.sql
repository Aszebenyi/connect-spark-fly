-- Create contact_submissions table
CREATE TABLE public.contact_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    company text,
    message text NOT NULL,
    status text DEFAULT 'new',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Only admins can view submissions (using the has_role function)
CREATE POLICY "Admins can view all contact submissions"
ON public.contact_submissions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert (for the public contact form)
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can update submissions (mark as read, etc.)
CREATE POLICY "Admins can update contact submissions"
ON public.contact_submissions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_contact_submissions_updated_at
BEFORE UPDATE ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create platform_settings table for configurable app settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  label text NOT NULL,
  description text,
  is_secret boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Admins can manage all settings
CREATE POLICY "Admins can view all platform settings"
ON public.platform_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform settings"
ON public.platform_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert platform settings"
ON public.platform_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete platform settings"
ON public.platform_settings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.platform_settings (key, value, category, label, description, is_secret) VALUES
-- Branding
('app_name', 'LeadPulse', 'branding', 'App Name', 'The name of your application displayed throughout the UI', false),
('app_tagline', 'AI-Powered Lead Generation', 'branding', 'Tagline', 'Short description shown on landing page and marketing', false),
('support_email', 'support@leadpulse.com', 'branding', 'Support Email', 'Email address for customer support inquiries', false),

-- Email Configuration
('email_from_name', 'LeadPulse', 'email', 'From Name', 'The sender name that appears in emails', false),
('email_from_address', 'onboarding@resend.dev', 'email', 'From Address', 'Email address to send from (must be verified in Resend)', false),
('dashboard_url', 'https://l5fb015fd-e37e-4e07-9949-571589e3e1ae.lovable.app', 'email', 'Dashboard URL', 'The URL of your app for email links', false),

-- Stripe Configuration
('stripe_starter_price_id', 'price_1Sl6DHDp7VRpgnTikwLRt1tw', 'stripe', 'Starter Price ID', 'Stripe Price ID for Starter plan', false),
('stripe_starter_product_id', 'prod_TiXHpO8ijpKqTp', 'stripe', 'Starter Product ID', 'Stripe Product ID for Starter plan', false),
('stripe_growth_price_id', 'price_1Sl6DJDp7VRpgnTi99xkXWPn', 'stripe', 'Growth Price ID', 'Stripe Price ID for Growth plan', false),
('stripe_growth_product_id', 'prod_TiXHO7iMyHkneq', 'stripe', 'Growth Product ID', 'Stripe Product ID for Growth plan', false),
('stripe_scale_price_id', 'price_1Sl6DLDp7VRpgnTiujlSkYLD', 'stripe', 'Scale Price ID', 'Stripe Price ID for Scale plan', false),
('stripe_scale_product_id', 'prod_TiXH8Xv4s6tGGb', 'stripe', 'Scale Product ID', 'Stripe Product ID for Scale plan', false),

-- Legal
('privacy_email', 'privacy@leadpulse.com', 'legal', 'Privacy Email', 'Email address for privacy-related inquiries', false),
('terms_url', '/terms', 'legal', 'Terms URL', 'URL path to terms of service page', false),
('privacy_url', '/privacy', 'legal', 'Privacy URL', 'URL path to privacy policy page', false);
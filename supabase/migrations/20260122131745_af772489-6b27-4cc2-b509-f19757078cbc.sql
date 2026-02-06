-- Email Templates Table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Sequences Table (automation rules)
CREATE TABLE public.email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  delay_minutes INTEGER DEFAULT 0,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Log Table (sent email history)
CREATE TABLE public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_sent TEXT NOT NULL,
  status TEXT DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates (admin only)
CREATE POLICY "Admins can view all email templates"
ON public.email_templates FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create email templates"
ON public.email_templates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update email templates"
ON public.email_templates FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete email templates"
ON public.email_templates FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for email_sequences (admin only)
CREATE POLICY "Admins can view all email sequences"
ON public.email_sequences FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create email sequences"
ON public.email_sequences FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update email sequences"
ON public.email_sequences FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete email sequences"
ON public.email_sequences FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for email_log (admin can see all, users can see their own)
CREATE POLICY "Admins can view all email logs"
ON public.email_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert email logs"
ON public.email_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update email logs"
ON public.email_log FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_sequences_updated_at
BEFORE UPDATE ON public.email_sequences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (name, subject, body_html, category, variables) VALUES
(
  'Welcome Email',
  'Welcome to LeadPulse, {{user_name}}! 🚀',
  '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #1a1a1a; margin-bottom: 24px;">Welcome to LeadPulse! 🎉</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">You''re now ready to discover high-quality leads using AI-powered search.</p>
    <h3 style="color: #1a1a1a; margin-top: 32px;">Here''s how to get started:</h3>
    <ol style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
      <li>Create your first campaign</li>
      <li>Describe your ideal customer</li>
      <li>Watch as we find matching leads</li>
    </ol>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-top: 24px;">You have <strong>{{credits_remaining}} credits</strong> to start with.</p>
    <a href="{{dashboard_url}}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">Create Your First Campaign →</a>
    <p style="color: #888; font-size: 14px; margin-top: 40px;">Questions? Just reply to this email.</p>
    <p style="color: #4a4a4a; font-size: 16px; margin-top: 24px;">— The LeadPulse Team</p>
  </div>',
  'welcome',
  '["user_name", "credits_remaining", "dashboard_url"]'::jsonb
),
(
  'Leads Found Notification',
  '🎯 {{lead_count}} new leads discovered for your campaign!',
  '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #1a1a1a; margin-bottom: 24px;">Great news! 🎯</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">We''ve just discovered <strong>{{lead_count}} new leads</strong> for your campaign "<strong>{{campaign_name}}</strong>".</p>
    <div style="background: #f5f3ff; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <p style="color: #7c3aed; font-size: 36px; font-weight: 700; margin: 0;">{{lead_count}}</p>
      <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">New Qualified Leads</p>
    </div>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">These leads match your target criteria and are ready for outreach.</p>
    <a href="{{dashboard_url}}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">View Your Leads →</a>
    <p style="color: #888; font-size: 14px; margin-top: 40px;">Credits remaining: {{credits_remaining}}</p>
    <p style="color: #4a4a4a; font-size: 16px; margin-top: 24px;">— The LeadPulse Team</p>
  </div>',
  'leads_found',
  '["user_name", "lead_count", "campaign_name", "credits_remaining", "dashboard_url"]'::jsonb
),
(
  'Low Credits Warning',
  '⚠️ Your LeadPulse credits are running low',
  '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #1a1a1a; margin-bottom: 24px;">Credits Running Low ⚠️</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">You have <strong>{{credits_remaining}} credits</strong> remaining out of {{credits_limit}}.</p>
    <div style="background: #fef3c7; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <p style="color: #d97706; font-size: 36px; font-weight: 700; margin: 0;">{{credits_remaining}}</p>
      <p style="color: #92400e; font-size: 14px; margin: 4px 0 0;">Credits Remaining</p>
    </div>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Upgrade your plan to continue discovering new leads without interruption.</p>
    <a href="{{dashboard_url}}/settings" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">Upgrade Your Plan →</a>
    <p style="color: #888; font-size: 14px; margin-top: 40px;">Current plan: {{plan_name}}</p>
    <p style="color: #4a4a4a; font-size: 16px; margin-top: 24px;">— The LeadPulse Team</p>
  </div>',
  'low_credits',
  '["user_name", "credits_remaining", "credits_limit", "plan_name", "dashboard_url"]'::jsonb
),
(
  'Subscription Activated',
  '🎊 Your {{plan_name}} plan is now active!',
  '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #1a1a1a; margin-bottom: 24px;">You''re All Set! 🎊</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Your <strong>{{plan_name}}</strong> subscription is now active.</p>
    <div style="background: #ecfdf5; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <p style="color: #059669; font-size: 24px; font-weight: 700; margin: 0;">{{credits_limit}} Credits</p>
      <p style="color: #047857; font-size: 14px; margin: 4px 0 0;">Now Available</p>
    </div>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">You now have access to all {{plan_name}} features. Start discovering leads right away!</p>
    <a href="{{dashboard_url}}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">Go to Dashboard →</a>
    <p style="color: #4a4a4a; font-size: 16px; margin-top: 24px;">— The LeadPulse Team</p>
  </div>',
  'subscription_activated',
  '["user_name", "plan_name", "credits_limit", "dashboard_url"]'::jsonb
),
(
  'Weekly Summary',
  '📊 Your weekly LeadPulse report',
  '<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="color: #1a1a1a; margin-bottom: 24px;">Weekly Report 📊</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hi {{user_name}},</p>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Here''s your weekly summary:</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
      <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; text-align: center;">
        <p style="color: #7c3aed; font-size: 28px; font-weight: 700; margin: 0;">{{leads_this_week}}</p>
        <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Leads Found</p>
      </div>
      <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; text-align: center;">
        <p style="color: #059669; font-size: 28px; font-weight: 700; margin: 0;">{{emails_sent}}</p>
        <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Emails Sent</p>
      </div>
    </div>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Credits remaining: <strong>{{credits_remaining}}</strong> / {{credits_limit}}</p>
    <a href="{{dashboard_url}}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 24px;">View Full Dashboard →</a>
    <p style="color: #4a4a4a; font-size: 16px; margin-top: 24px;">— The LeadPulse Team</p>
  </div>',
  'weekly_summary',
  '["user_name", "leads_this_week", "emails_sent", "credits_remaining", "credits_limit", "dashboard_url"]'::jsonb
);

-- Insert default email sequences
INSERT INTO public.email_sequences (name, description, trigger_event, delay_minutes, template_id, is_active)
SELECT 
  'Welcome Sequence',
  'Automatically sends welcome email when a new user signs up',
  'user_signup',
  0,
  id,
  true
FROM public.email_templates WHERE category = 'welcome' LIMIT 1;

INSERT INTO public.email_sequences (name, description, trigger_event, delay_minutes, template_id, is_active)
SELECT 
  'Leads Found Alert',
  'Notifies user when new leads are discovered for their campaign',
  'leads_found',
  0,
  id,
  true
FROM public.email_templates WHERE category = 'leads_found' LIMIT 1;

INSERT INTO public.email_sequences (name, description, trigger_event, delay_minutes, template_id, is_active)
SELECT 
  'Low Credits Alert',
  'Warns user when credits drop below 10%',
  'low_credits',
  0,
  id,
  true
FROM public.email_templates WHERE category = 'low_credits' LIMIT 1;

INSERT INTO public.email_sequences (name, description, trigger_event, delay_minutes, template_id, is_active)
SELECT 
  'Subscription Activated',
  'Confirms new subscription activation',
  'subscription_activated',
  0,
  id,
  true
FROM public.email_templates WHERE category = 'subscription_activated' LIMIT 1;

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: new lead
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (NEW.user_id, 'lead_added', 'New candidate added',
    'Candidate ' || COALESCE(NEW.name, 'Unknown') || ' has been added.');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- Trigger: lead status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'status_change', 'Status updated',
      COALESCE(NEW.name, 'A candidate') || ' moved to ' || COALESCE(NEW.status, 'unknown'));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_status_change
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();

-- Trigger: new campaign
CREATE OR REPLACE FUNCTION public.notify_new_campaign()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (NEW.user_id, 'campaign_created', 'New job opening created',
    '"' || COALESCE(NEW.name, 'Untitled') || '" has been created.');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_campaign
  AFTER INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_campaign();

-- Trigger: outreach email sent
CREATE OR REPLACE FUNCTION public.notify_email_sent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    (SELECT user_id FROM public.leads WHERE id = NEW.lead_id),
    'email_sent', 'Email sent',
    'Outreach email sent to ' || COALESCE(
      (SELECT email FROM public.leads WHERE id = NEW.lead_id), 'a candidate'
    )
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_email_sent
  AFTER INSERT ON public.outreach_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_email_sent();

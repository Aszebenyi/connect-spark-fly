

## Remove Notification Preferences and Add Notification Bell

### What changes

1. **Delete** the "Notifications" section from Settings (the toggle switches for Email Digest, Lead Alerts, etc.) and all related code (state, load, save functions).

2. **Create a `notifications` database table** to store in-app notifications per user, with columns: id, user_id, type, title, message, read, created_at. Enable realtime on it.

3. **Create a database trigger** that automatically inserts a notification row whenever key activities happen:
   - New lead inserted (type: "lead_added")
   - Lead status changed (type: "status_change")
   - New campaign created (type: "campaign_created")
   - New outreach message sent (type: "email_sent")

4. **Build a NotificationBell component** -- a bell icon in the top-right of the dashboard header area that shows:
   - A red badge with unread count
   - A dropdown popover listing recent notifications (title, message, timestamp)
   - "Mark all as read" button
   - Each notification clickable to mark as read
   - Realtime subscription so new notifications appear instantly

5. **Place the bell** in the dashboard's main content area header (next to the page title or in the top bar).

### Technical Details

**Database migration:**
```sql
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
```

**Triggers for automatic notifications:**
```sql
-- On new lead
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (NEW.user_id, 'lead_added', 'New candidate added',
    'Candidate ' || COALESCE(NEW.name, 'Unknown') || ' has been added.');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION notify_new_lead();

-- On lead status change
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
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
  FOR EACH ROW EXECUTE FUNCTION notify_status_change();

-- On new campaign
CREATE OR REPLACE FUNCTION notify_new_campaign()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (NEW.user_id, 'campaign_created', 'New job opening created',
    '"' || COALESCE(NEW.name, 'Untitled') || '" has been created.');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_new_campaign
  AFTER INSERT ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION notify_new_campaign();

-- On outreach email sent
CREATE OR REPLACE FUNCTION notify_email_sent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (NEW.user_id, 'email_sent', 'Email sent',
    'Outreach email sent to ' || COALESCE(NEW.recipient_email, 'a candidate'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_email_sent
  AFTER INSERT ON public.outreach_messages
  FOR EACH ROW EXECUTE FUNCTION notify_email_sent();
```

**Files to modify:**
- `src/components/SettingsPage.tsx` -- Remove the Notifications section (lines 398-434), remove `notifications` state, `handleSaveNotifications`, and the `loadPrefs` useEffect
- `src/pages/Dashboard.tsx` -- Add NotificationBell to the header area

**Files to create:**
- `src/components/NotificationBell.tsx` -- Bell icon with Popover dropdown, unread badge, realtime subscription, mark-as-read functionality
- `src/hooks/useNotifications.ts` -- Hook to fetch notifications, subscribe to realtime, and provide mark-as-read actions


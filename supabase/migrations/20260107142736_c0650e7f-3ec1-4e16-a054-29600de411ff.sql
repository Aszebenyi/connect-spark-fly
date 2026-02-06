-- Create function to atomically increment credits used
CREATE OR REPLACE FUNCTION increment_credits_used(p_user_id uuid, p_amount integer)
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET credits_used = COALESCE(credits_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for subscriptions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
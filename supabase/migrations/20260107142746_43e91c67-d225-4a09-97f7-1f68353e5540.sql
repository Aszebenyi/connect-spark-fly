-- Fix search_path for increment_credits_used function
CREATE OR REPLACE FUNCTION increment_credits_used(p_user_id uuid, p_amount integer)
RETURNS void AS $$
BEGIN
  UPDATE public.subscriptions
  SET credits_used = COALESCE(credits_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
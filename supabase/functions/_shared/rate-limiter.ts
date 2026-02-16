interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'exa-search': { requests: 10, windowMs: 60000 },
  'generate-outreach': { requests: 20, windowMs: 60000 },
  'send-email': { requests: 50, windowMs: 86400000 },
  'apify-scrape': { requests: 20, windowMs: 60000 },
  'extract-company-identity': { requests: 30, windowMs: 60000 },
  'free-lead-sample': { requests: 3, windowMs: 86400000 },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function checkRateLimit(
  supabase: any,
  userId: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; retryAfter?: number }> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    return { allowed: true, remaining: Infinity, resetAt: new Date() };
  }

  const windowStart = new Date(Date.now() - config.windowMs);

  try {
    // Inline cleanup: delete stale entries older than 24h
    await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 86400000).toISOString());

    const { data: existing, error: selectError } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('user_id', userId)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Rate limit check error:', selectError);
      return { allowed: true, remaining: config.requests, resetAt: new Date() };
    }

    const currentCount = existing?.request_count || 0;
    const resetAt = existing?.window_start
      ? new Date(new Date(existing.window_start).getTime() + config.windowMs)
      : new Date(Date.now() + config.windowMs);

    if (currentCount >= config.requests) {
      const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
      return { allowed: false, remaining: 0, resetAt, retryAfter };
    }

    if (existing) {
      await supabase
        .from('rate_limits')
        .update({ request_count: currentCount + 1 })
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
        .eq('window_start', existing.window_start);
    } else {
      await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          endpoint,
          window_start: new Date().toISOString(),
          request_count: 1,
        });
    }

    return { allowed: true, remaining: config.requests - (currentCount + 1), resetAt };
  } catch (error) {
    console.error('Rate limit error:', error);
    return { allowed: true, remaining: config.requests, resetAt: new Date() };
  }
}

export function rateLimitResponse(resetAt: Date, retryAfter: number) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter,
      resetAt: resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': Math.floor(resetAt.getTime() / 1000).toString(),
      },
    }
  );
}

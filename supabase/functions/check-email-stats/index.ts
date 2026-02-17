import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const supabaseClient = createClient(
      SUPABASE_URL!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // Get today's send count
    const { data: todayData } = await supabaseAdmin
      .from("email_send_limits")
      .select("emails_sent")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    const emailsSentToday = todayData?.emails_sent || 0;

    // Get Gmail connection age
    const { data: connection } = await supabaseAdmin
      .from("email_connections")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .eq("is_active", true)
      .maybeSingle();

    const accountAgeDays = connection?.created_at
      ? Math.floor((Date.now() - new Date(connection.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Recommended limits based on account age
    let recommendedLimit = 50;
    if (accountAgeDays < 7) recommendedLimit = 10;
    else if (accountAgeDays < 14) recommendedLimit = 20;
    else if (accountAgeDays < 30) recommendedLimit = 30;

    const approachingLimit = emailsSentToday >= Math.floor(recommendedLimit * 0.8);
    const overLimit = emailsSentToday >= recommendedLimit;

    return new Response(
      JSON.stringify({
        emails_sent_today: emailsSentToday,
        recommended_limit: recommendedLimit,
        account_age_days: accountAgeDays,
        approaching_limit: approachingLimit,
        over_limit: overLimit,
        has_connection: !!connection,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Check email stats error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

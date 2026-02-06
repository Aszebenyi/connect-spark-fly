import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Scopes needed for sending emails
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawBody = await req.text();
    let body: Record<string, any> = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = {};
      }
    }
    const action = body.action ?? url.searchParams.get("action");

    console.log(`Gmail Auth - Action: ${action}`);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Missing Google OAuth credentials");
      return new Response(
        JSON.stringify({ error: "Google OAuth not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "authorize") {
      const redirectUri = body.redirectUri;

      if (!redirectUri) {
        return new Response(
          JSON.stringify({ error: "Redirect URI is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build Google OAuth URL
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES.join(" "));
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");

      console.log("Generated OAuth URL for redirect URI:", redirectUri);

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "callback") {
      // Get auth token from header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create Supabase client with service role to update tokens
      const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Get user from auth token
      const supabaseClient = createClient(
        SUPABASE_URL!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

      if (userError || !user) {
        console.error("User auth error:", userError);
        return new Response(
          JSON.stringify({ error: "Invalid user session" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { code, redirectUri } = body;

      if (!code || !redirectUri) {
        return new Response(
          JSON.stringify({ error: "Code and redirect URI are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Exchanging code for tokens...");

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("Token exchange error:", tokenData);
        return new Response(
          JSON.stringify({ error: tokenData.error_description || "Failed to exchange code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Token exchange successful, fetching user info...");

      // Get user's email from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const userInfo = await userInfoResponse.json();

      if (!userInfo.email) {
        console.error("Failed to get user email:", userInfo);
        return new Response(
          JSON.stringify({ error: "Failed to get email from Google" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("User email:", userInfo.email);

      // Calculate token expiration
      const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Upsert email connection
      const { error: upsertError } = await supabaseAdmin
        .from("email_connections")
        .upsert({
          user_id: user.id,
          provider: "gmail",
          email: userInfo.email,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,provider",
        });

      if (upsertError) {
        console.error("Database upsert error:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to save email connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Email connection saved successfully");

      return new Response(
        JSON.stringify({ success: true, email: userInfo.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "disconnect") {
      // Get auth token from header
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create Supabase client
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

      // Delete email connection
      const { error: deleteError } = await supabaseClient
        .from("email_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", "gmail");

      if (deleteError) {
        console.error("Delete error:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to disconnect" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Email connection deleted successfully");

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action", received: action ?? null }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Gmail auth error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

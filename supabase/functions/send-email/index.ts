import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Token refresh error:", data);
      return null;
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
}

function wrapInHtmlTemplate(content: string): string {
  // Convert plain text to HTML if needed (handles legacy plain text content)
  let htmlContent = content;
  
  // If content doesn't have HTML tags, convert plain text to HTML
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    // Convert double line breaks to paragraph breaks
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
    htmlContent = paragraphs.map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title></title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 48px; font-size: 16px; line-height: 1.6; color: #18181b;">
              ${htmlContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function createRawEmail(to: string, from: string, subject: string, body: string): string {
  const htmlBody = wrapInHtmlTemplate(body);
  
  const emailLines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlBody,
  ];

  const email = emailLines.join("\r\n");
  
  // Base64 URL-safe encoding
  const encodedEmail = btoa(email)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return encodedEmail;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
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

    const reqBody = await req.json();
    const { leadId, to, subject, emailBody, campaignId } = reqBody;

    // Validate required fields
    if (!to || !subject || !emailBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, emailBody" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof to !== 'string' || !emailRegex.test(to) || to.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid recipient email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate subject length
    if (typeof subject !== 'string' || subject.length === 0 || subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject must be between 1 and 200 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email body length
    if (typeof emailBody !== 'string' || emailBody.length === 0 || emailBody.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Email body must be between 1 and 50000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID formats if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (leadId !== undefined && leadId !== null && (typeof leadId !== 'string' || !uuidRegex.test(leadId))) {
      return new Response(
        JSON.stringify({ error: "Invalid lead ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (campaignId !== undefined && campaignId !== null && (typeof campaignId !== 'string' || !uuidRegex.test(campaignId))) {
      return new Response(
        JSON.stringify({ error: "Invalid campaign ID format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending email to ${to} for user ${user.id}`);

    // Validate email body for dangerous HTML patterns
    const dangerousPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(emailBody)) {
        return new Response(
          JSON.stringify({ error: "Prohibited HTML content detected" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get user's email connection using service role (tokens not exposed to client)
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("email_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .eq("is_active", true)
      .single();

    if (connectionError || !connection) {
      console.error("No email connection found:", connectionError);
      return new Response(
        JSON.stringify({ error: "No Gmail account connected. Please connect your Gmail in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = connection.access_token;

    // Check if token is expired or about to expire (within 5 minutes)
    const tokenExpiry = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (tokenExpiry < fiveMinutesFromNow) {
      console.log("Token expired or expiring soon, refreshing...");
      
      const refreshResult = await refreshAccessToken(connection.refresh_token);
      
      if (!refreshResult) {
        // Token refresh failed, user needs to reconnect
        await supabaseAdmin
          .from("email_connections")
          .update({ is_active: false })
          .eq("id", connection.id);

        return new Response(
          JSON.stringify({ error: "Gmail connection expired. Please reconnect your Gmail account." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      accessToken = refreshResult.access_token;
      const newExpiry = new Date(Date.now() + refreshResult.expires_in * 1000);

      // Update token in database
      await supabaseAdmin
        .from("email_connections")
        .update({
          access_token: accessToken,
          token_expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      console.log("Token refreshed successfully");
    }

    // Create the email
    const rawEmail = createRawEmail(to, connection.email, subject, emailBody);

    // Send via Gmail API
    const sendResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEmail }),
    });

    const sendResult = await sendResponse.json();

    if (sendResult.error) {
      console.error("Gmail API error:", sendResult.error);
      return new Response(
        JSON.stringify({ error: sendResult.error.message || "Failed to send email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully, message ID:", sendResult.id);

    // Track daily email count
    const today = new Date().toISOString().split("T")[0];
    const { data: existingLimit } = await supabaseAdmin
      .from("email_send_limits")
      .select("emails_sent")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (existingLimit) {
      await supabaseAdmin
        .from("email_send_limits")
        .update({ emails_sent: existingLimit.emails_sent + 1 })
        .eq("user_id", user.id)
        .eq("date", today);
    } else {
      await supabaseAdmin
        .from("email_send_limits")
        .insert({ user_id: user.id, date: today, emails_sent: 1 });
    }

    const emailsSentToday = (existingLimit?.emails_sent || 0) + 1;

    // Calculate recommended limit based on account age
    const accountAgeDays = connection.created_at
      ? Math.floor((Date.now() - new Date(connection.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let recommendedLimit = 50;
    if (accountAgeDays < 7) recommendedLimit = 10;
    else if (accountAgeDays < 14) recommendedLimit = 20;
    else if (accountAgeDays < 30) recommendedLimit = 30;

    // Update lead status to 'contacted' if leadId provided
    if (leadId) {
      const { error: leadError } = await supabaseClient
        .from("leads")
        .update({ status: "contacted", updated_at: new Date().toISOString() })
        .eq("id", leadId);

      if (leadError) {
        console.error("Failed to update lead status:", leadError);
      }
    }

    // Increment campaign sent count if campaignId provided
    if (campaignId) {
      const { error: rpcError } = await supabaseAdmin.rpc("increment_campaign_sent", {
        p_campaign_id: campaignId,
      });

      if (rpcError) {
        console.error("Failed to increment campaign sent count:", rpcError);
      }
    }

    // Save outreach message
    if (leadId) {
      const { error: messageError } = await supabaseClient
        .from("outreach_messages")
        .insert({
          lead_id: leadId,
          campaign_id: campaignId || null,
          subject,
          body: emailBody,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

      if (messageError) {
        console.error("Failed to save outreach message:", messageError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: sendResult.id,
        warning: emailsSentToday >= recommendedLimit ? {
          emails_sent_today: emailsSentToday,
          recommended_limit: recommendedLimit,
          account_age_days: accountAgeDays,
          over_limit: true,
        } : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Send email error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logInfo, logError } from '../_shared/logger.ts';

// Set up Supabase cron: 
// SELECT cron.schedule('check-replies', '*/15 * * * *', $$
//   SELECT net.http_post(
//     url:='https://ecpgqyhjoycfnuandyws.supabase.co/functions/v1/check-gmail-replies',
//     headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
//     body:='{}'::jsonb
//   ) as request_id;
// $$);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const MAX_USERS_PER_RUN = 50;
const MAX_EMAILS_PER_USER = 20;

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
      logError(data, { endpoint: 'check-gmail-replies', step: 'token_refresh' });
      return null;
    }
    return { access_token: data.access_token, expires_in: data.expires_in };
  } catch (error) {
    logError(error, { endpoint: 'check-gmail-replies', step: 'token_refresh' });
    return null;
  }
}

async function getValidAccessToken(
  supabaseAdmin: any,
  connection: any
): Promise<string | null> {
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);

  if (expiresAt > now) {
    return connection.access_token;
  }

  const refreshed = await refreshAccessToken(connection.refresh_token);
  if (!refreshed) return null;

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from('email_connections')
    .update({ access_token: refreshed.access_token, token_expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq('id', connection.id);

  return refreshed.access_token;
}

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  threadId: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
}

async function getGmailThreadMessages(accessToken: string, threadId: string): Promise<GmailMessageDetail[]> {
  try {
    const resp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=Subject`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.messages || [];
  } catch {
    return [];
  }
}

async function searchInboxReplies(accessToken: string): Promise<GmailMessage[]> {
  try {
    const q = encodeURIComponent('in:inbox is:unread');
    const resp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.messages || [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    logInfo('Starting reply check run', { endpoint: 'check-gmail-replies' });

    // Get users who sent emails in last 7 days (via email_log)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentSenders } = await supabaseAdmin
      .from('email_log')
      .select('user_id')
      .gte('sent_at', sevenDaysAgo)
      .eq('status', 'sent')
      .not('user_id', 'is', null);

    if (!recentSenders || recentSenders.length === 0) {
      logInfo('No recent senders found', { endpoint: 'check-gmail-replies' });
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplicate user IDs
    const uniqueUserIds = [...new Set(recentSenders.map((r: any) => r.user_id))].slice(0, MAX_USERS_PER_RUN);

    let totalRepliesFound = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Get active Gmail connection
        const { data: connection } = await supabaseAdmin
          .from('email_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('provider', 'gmail')
          .eq('is_active', true)
          .maybeSingle();

        if (!connection) continue;

        const accessToken = await getValidAccessToken(supabaseAdmin, connection);
        if (!accessToken) continue;

        // Get sent emails without replies (last 14 days)
        const { data: sentEmails } = await supabaseAdmin
          .from('email_log')
          .select('id, metadata, subject')
          .eq('user_id', userId)
          .eq('status', 'sent')
          .is('replied_at', null)
          .gte('sent_at', fourteenDaysAgo)
          .not('metadata', 'is', null)
          .limit(MAX_EMAILS_PER_USER);

        if (!sentEmails || sentEmails.length === 0) continue;

        // Build a map of gmail_message_id -> email_log entry
        const messageIdMap = new Map<string, any>();
        const threadIdMap = new Map<string, any>();

        for (const email of sentEmails) {
          const gmailMsgId = email.metadata?.gmail_message_id;
          if (gmailMsgId) {
            messageIdMap.set(gmailMsgId, email);
          }
        }

        if (messageIdMap.size === 0) continue;

        // For each sent message, get its threadId
        for (const [gmailMsgId, emailLog] of messageIdMap.entries()) {
          try {
            const resp = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMsgId}?format=minimal`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (resp.ok) {
              const msgData = await resp.json();
              if (msgData.threadId) {
                threadIdMap.set(msgData.threadId, emailLog);
              }
            }
          } catch {
            // Skip individual message errors
          }
        }

        if (threadIdMap.size === 0) continue;

        // Search inbox for unread replies
        const inboxMessages = await searchInboxReplies(accessToken);

        for (const msg of inboxMessages) {
          const emailLog = threadIdMap.get(msg.threadId);
          if (!emailLog) continue;

          // Found a reply! Update email_log
          const now = new Date().toISOString();
          await supabaseAdmin
            .from('email_log')
            .update({ replied_at: now })
            .eq('id', emailLog.id);

          // Get lead_id from metadata and update lead status
          const leadId = emailLog.metadata?.lead_id;
          if (leadId) {
            const { data: lead } = await supabaseAdmin
              .from('leads')
              .select('id, status, name')
              .eq('id', leadId)
              .maybeSingle();

            if (lead && lead.status === 'contacted') {
              await supabaseAdmin
                .from('leads')
                .update({ status: 'replied', updated_at: now })
                .eq('id', leadId);
            }

            // Create a lead_note
            await supabaseAdmin
              .from('lead_notes')
              .insert({
                lead_id: leadId,
                user_id: userId,
                content: `Candidate replied to email: "${emailLog.subject}"`,
                note_type: 'system',
              });
          }

          totalRepliesFound++;
          logInfo('Reply detected', { endpoint: 'check-gmail-replies', userId, emailLogId: emailLog.id });
        }
      } catch (userErr) {
        logError(userErr, { endpoint: 'check-gmail-replies', userId });
      }
    }

    logInfo(`Reply check complete: ${totalRepliesFound} replies found across ${uniqueUserIds.length} users`, {
      endpoint: 'check-gmail-replies',
    });

    return new Response(
      JSON.stringify({ processed: uniqueUserIds.length, replies_found: totalRepliesFound }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError(error, { endpoint: 'check-gmail-replies' });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

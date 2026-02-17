import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logInfo, logError } from '../_shared/logger.ts';

// Set up Supabase cron (Monday 9am ET = 14:00 UTC):
// SELECT cron.schedule('weekly-digest', '0 14 * * 1', $$
//   SELECT net.http_post(
//     url:='https://ecpgqyhjoycfnuandyws.supabase.co/functions/v1/weekly-digest',
//     headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
//     body:='{}'::jsonb
//   ) as request_id;
// $$);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function buildDigestHtml(stats: {
  userName: string;
  candidatesFound: number;
  emailsSent: number;
  repliesReceived: number;
  actionItems: number;
  staleLeads: number;
  dashboardUrl: string;
}): string {
  const { userName, candidatesFound, emailsSent, repliesReceived, actionItems, staleLeads, dashboardUrl } = stats;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

<!-- Header -->
<tr><td style="padding:32px 32px 16px;background:linear-gradient(135deg,#0f172a,#1e293b);">
  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">Your Weekly Summary</h1>
  <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Hi ${userName}, here's what happened this week</p>
</td></tr>

<!-- Stats Grid -->
<tr><td style="padding:24px 32px;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td width="50%" style="padding:8px;">
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${candidatesFound}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Candidates Found</div>
        </div>
      </td>
      <td width="50%" style="padding:8px;">
        <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#2563eb;">${emailsSent}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Emails Sent</div>
        </div>
      </td>
    </tr>
    <tr>
      <td width="50%" style="padding:8px;">
        <div style="background:#faf5ff;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#7c3aed;">${repliesReceived}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Replies Received</div>
        </div>
      </td>
      <td width="50%" style="padding:8px;">
        <div style="background:#fefce8;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#ca8a04;">${staleLeads}</div>
          <div style="font-size:12px;color:#4b5563;margin-top:4px;">Need Attention</div>
        </div>
      </td>
    </tr>
  </table>
</td></tr>

${actionItems > 0 ? `
<!-- Action Items -->
<tr><td style="padding:0 32px 24px;">
  <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:16px;">
    <div style="font-size:14px;font-weight:600;color:#1e40af;">🎯 ${actionItems} candidate${actionItems > 1 ? 's' : ''} replied — follow up!</div>
    <div style="font-size:12px;color:#3b82f6;margin-top:4px;">These candidates responded to your outreach and are waiting to hear back.</div>
  </div>
</td></tr>
` : ''}

<!-- CTA -->
<tr><td align="center" style="padding:0 32px 32px;">
  <a href="${dashboardUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
    Open Dashboard →
  </a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
  <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
    You're receiving this because you have an active MediLead account.<br>
    To unsubscribe, update your email preferences in Settings.
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    logInfo('Starting weekly digest', { endpoint: 'weekly-digest' });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get active users (have leads or campaigns in last 30 days)
    const { data: recentLeadUsers } = await supabaseAdmin
      .from('leads')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo)
      .not('user_id', 'is', null);

    const { data: recentCampaignUsers } = await supabaseAdmin
      .from('campaigns')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo)
      .not('user_id', 'is', null);

    const allUserIds = new Set<string>();
    recentLeadUsers?.forEach((r: any) => allUserIds.add(r.user_id));
    recentCampaignUsers?.forEach((r: any) => allUserIds.add(r.user_id));

    if (allUserIds.size === 0) {
      logInfo('No active users for digest', { endpoint: 'weekly-digest' });
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get profiles to check email preferences and get user info
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, full_name, email_preferences')
      .in('user_id', [...allUserIds]);

    // Get email settings
    const { data: emailSettings } = await supabaseAdmin
      .from('platform_settings')
      .select('key, value')
      .in('key', ['email_from_name', 'email_from_address']);

    const fromName = emailSettings?.find((s: any) => s.key === 'email_from_name')?.value || 'MediLead';
    const fromAddress = emailSettings?.find((s: any) => s.key === 'email_from_address')?.value || 'onboarding@resend.dev';

    // Check do_not_contact
    const { data: dncEntries } = await supabaseAdmin
      .from('do_not_contact')
      .select('email');

    const dncEmails = new Set((dncEntries || []).map((d: any) => d.email?.toLowerCase()));

    let sentCount = 0;

    for (const profile of (profiles || [])) {
      try {
        if (!profile.email) continue;

        // Check digest preference
        const prefs = profile.email_preferences as any;
        if (prefs && prefs.digest === false) continue;

        // Check do_not_contact
        if (dncEmails.has(profile.email.toLowerCase())) continue;

        const userId = profile.user_id;

        // Calculate stats for this user
        const [
          { count: candidatesFound },
          { count: emailsSent },
          { data: repliedLeads },
          { data: staleLeadsList },
        ] = await Promise.all([
          supabaseAdmin.from('leads').select('*', { count: 'exact', head: true })
            .eq('user_id', userId).gte('created_at', oneWeekAgo),
          supabaseAdmin.from('outreach_messages').select('*', { count: 'exact', head: true })
            .in('lead_id', (await supabaseAdmin.from('leads').select('id').eq('user_id', userId)).data?.map((l: any) => l.id) || [])
            .gte('created_at', oneWeekAgo),
          supabaseAdmin.from('leads').select('id')
            .eq('user_id', userId).eq('status', 'replied').gte('updated_at', oneWeekAgo),
          supabaseAdmin.from('leads').select('id')
            .eq('user_id', userId)
            .not('status', 'in', '("hired","lost","replied")')
            .lt('updated_at', oneWeekAgo),
        ]);

        const repliesReceived = repliedLeads?.length || 0;
        const staleLeads = staleLeadsList?.length || 0;

        // Action items: replied leads without follow-up outreach
        let actionItems = 0;
        if (repliedLeads && repliedLeads.length > 0) {
          for (const lead of repliedLeads) {
            const { data: followUps } = await supabaseAdmin
              .from('outreach_messages')
              .select('id')
              .eq('lead_id', lead.id)
              .gte('created_at', oneWeekAgo)
              .order('created_at', { ascending: false })
              .limit(1);
            // If the most recent outreach is before the reply, it's an action item
            if (!followUps || followUps.length === 0) actionItems++;
          }
        }

        // Skip if nothing to report
        if (candidatesFound === 0 && emailsSent === 0 && repliesReceived === 0 && staleLeads === 0) continue;

        const userName = profile.full_name || 'there';
        const dashboardUrl = `${SUPABASE_URL?.replace('.supabase.co', '').replace('https://ecpgqyhjoycfnuandyws', 'https://connect-spark-fly.lovable.app')}/dashboard`;
        // Use a fixed dashboard URL
        const actualDashboardUrl = 'https://connect-spark-fly.lovable.app/dashboard';

        const subject = `Your MediLead Weekly: ${candidatesFound} candidates found, ${repliesReceived} replies`;
        const html = buildDigestHtml({
          userName,
          candidatesFound: candidatesFound || 0,
          emailsSent: emailsSent || 0,
          repliesReceived,
          actionItems,
          staleLeads,
          dashboardUrl: actualDashboardUrl,
        });

        // Send via Resend
        const emailResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromAddress}>`,
            to: [profile.email],
            subject,
            html,
          }),
        });

        if (emailResp.ok) {
          sentCount++;
          logInfo(`Digest sent to ${profile.email}`, { endpoint: 'weekly-digest', userId });
        } else {
          const errData = await emailResp.json();
          logError(errData, { endpoint: 'weekly-digest', userId, step: 'resend' });
        }
      } catch (userErr) {
        logError(userErr, { endpoint: 'weekly-digest', userId: profile.user_id });
      }
    }

    logInfo(`Weekly digest complete: ${sentCount} emails sent`, { endpoint: 'weekly-digest' });

    return new Response(
      JSON.stringify({ sent: sentCount, total_users: allUserIds.size }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError(error, { endpoint: 'weekly-digest' });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

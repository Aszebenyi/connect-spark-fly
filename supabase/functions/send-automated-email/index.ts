import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  event_type: 'user_signup' | 'leads_found' | 'low_credits' | 'subscription_activated' | 'weekly_summary';
  user_id: string;
  data?: {
    lead_count?: number;
    campaign_name?: string;
    leads_this_week?: number;
    emails_sent?: number;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { event_type, user_id, data = {} }: EmailRequest = await req.json();

    console.log('Processing automated email:', { event_type, user_id, data });

    if (!event_type || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing event_type or user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find active sequence for this event
    const { data: sequence, error: seqError } = await supabase
      .from('email_sequences')
      .select('*, email_templates(*)')
      .eq('trigger_event', event_type)
      .eq('is_active', true)
      .single();

    if (seqError || !sequence) {
      console.log('No active sequence found for event:', event_type);
      return new Response(
        JSON.stringify({ message: 'No active sequence for this event', event_type }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const template = sequence.email_templates;
    if (!template) {
      console.error('Sequence has no template');
      return new Response(
        JSON.stringify({ error: 'Sequence has no template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user data and platform settings in parallel
    const [profileResult, subscriptionResult, settingsResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user_id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', user_id).single(),
      supabase.from('platform_settings').select('key, value').in('key', ['email_from_name', 'email_from_address', 'dashboard_url', 'app_name'])
    ]);

    const profile = profileResult.data;
    const subscription = subscriptionResult.data;
    const platformSettings = settingsResult.data || [];

    // Extract platform settings
    const getSetting = (key: string, fallback: string) => 
      platformSettings.find(s => s.key === key)?.value || fallback;

    const fromName = getSetting('email_from_name', 'LeadPulse');
    const fromAddress = getSetting('email_from_address', 'onboarding@resend.dev');
    const dashboardUrl = getSetting('dashboard_url', '');
    const appName = getSetting('app_name', 'LeadPulse');

    const userName = profile?.full_name || profile?.email?.split('@')[0] || 'there';
    const userEmail = profile?.email;
    
    if (!userEmail) {
      console.error('User has no email');
      return new Response(
        JSON.stringify({ error: 'User has no email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build variable replacements
    const variables: Record<string, string> = {
      user_name: userName,
      credits_remaining: String(subscription?.credits_limit - (subscription?.credits_used || 0) || 0),
      credits_limit: String(subscription?.credits_limit || 0),
      plan_name: subscription?.plan_id?.charAt(0).toUpperCase() + (subscription?.plan_id?.slice(1) || 'Free'),
      dashboard_url: dashboardUrl,
      app_name: appName,
      lead_count: String(data.lead_count || 0),
      campaign_name: data.campaign_name || 'Your Campaign',
      leads_this_week: String(data.leads_this_week || 0),
      emails_sent: String(data.emails_sent || 0),
    };

    // Replace variables in subject and body
    let subject = template.subject;
    let body = template.body_html;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    // Create email log entry
    const { data: emailLog, error: logError } = await supabase
      .from('email_log')
      .insert({
        user_id,
        template_id: template.id,
        sequence_id: sequence.id,
        recipient_email: userEmail,
        recipient_name: userName,
        subject,
        body_sent: body,
        status: 'queued',
        metadata: { event_type, data },
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating email log:', logError);
    }

    // Check for delay - if delay > 0, just queue it (would need cron job for actual delayed sending)
    if (sequence.delay_minutes > 0) {
      console.log(`Email queued with ${sequence.delay_minutes} minute delay`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email queued for delayed sending',
          email_log_id: emailLog?.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send immediately via Resend
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      await supabase
        .from('email_log')
        .update({ status: 'failed', error_message: 'RESEND_API_KEY not configured' })
        .eq('id', emailLog?.id);
      
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add tracking pixel for open tracking
    const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email?id=${emailLog?.id}&type=open" width="1" height="1" style="display:none" />`;
    const bodyWithTracking = body + trackingPixel;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromAddress}>`,
        to: [userEmail],
        subject,
        html: bodyWithTracking,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend error:', emailResult);
      await supabase
        .from('email_log')
        .update({ 
          status: 'failed', 
          error_message: emailResult.message || 'Failed to send' 
        })
        .eq('id', emailLog?.id);

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update log to sent
    await supabase
      .from('email_log')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', emailLog?.id);

    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        email_id: emailResult.id,
        email_log_id: emailLog?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-automated-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

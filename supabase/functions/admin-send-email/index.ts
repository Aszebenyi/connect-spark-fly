import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendEmailResponse {
  id: string;
}

function logStep(step: string, details?: unknown) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-SEND-EMAIL] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      logStep('Missing RESEND_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      logStep('Auth failed', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      logStep('Access denied - not admin');
      return new Response(
        JSON.stringify({ error: 'Access denied - Admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { to, subject, html, replyTo } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Sending email', { to, subject });

    // Fetch email settings from platform_settings
    const { data: emailSettings } = await adminClient
      .from('platform_settings')
      .select('key, value')
      .in('key', ['email_from_name', 'email_from_address']);

    const fromName = emailSettings?.find(s => s.key === 'email_from_name')?.value || 'LeadPulse';
    const fromAddress = emailSettings?.find(s => s.key === 'email_from_address')?.value || 'onboarding@resend.dev';

    // Send email using Resend API directly
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromAddress}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo || undefined,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      logStep('Resend error', errorData);
      return new Response(
        JSON.stringify({ error: errorData.message || 'Failed to send email' }),
        { status: emailResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailData = await emailResponse.json() as ResendEmailResponse;
    logStep('Email sent', emailData);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Unexpected error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

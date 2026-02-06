import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logStep(step: string, details?: unknown) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DELETE-ACCOUNT] ${step}${detailsStr}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client for getting user info
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for deleting user data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      logStep('Auth failed', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    logStep('Starting account deletion', { userId });

    // Delete in order to respect foreign key constraints
    // 1. Get user's lead IDs first for outreach_messages
    const { data: userLeads } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('user_id', userId);
    
    const leadIds = userLeads?.map(l => l.id) || [];

    // 2. Delete outreach_messages (references leads)
    if (leadIds.length > 0) {
      const { error: outreachError } = await supabaseAdmin
        .from('outreach_messages')
        .delete()
        .in('lead_id', leadIds);
      if (outreachError) logStep('Outreach messages deletion warning', outreachError);
    }

    // 3. Delete credit_usage
    const { error: creditError } = await supabaseAdmin
      .from('credit_usage')
      .delete()
      .eq('user_id', userId);
    if (creditError) logStep('Credit usage deletion warning', creditError);

    // 4. Delete leads
    const { error: leadsError } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('user_id', userId);
    if (leadsError) logStep('Leads deletion warning', leadsError);

    // 5. Delete webset_searches (via campaigns)
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('user_id', userId);
    
    if (campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map(c => c.id);
      const { error: websetError } = await supabaseAdmin
        .from('webset_searches')
        .delete()
        .in('campaign_id', campaignIds);
      if (websetError) logStep('Webset searches deletion warning', websetError);
    }

    // 6. Delete campaigns
    const { error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('user_id', userId);
    if (campaignsError) logStep('Campaigns deletion warning', campaignsError);

    // 7. Delete email_connections
    const { error: emailError } = await supabaseAdmin
      .from('email_connections')
      .delete()
      .eq('user_id', userId);
    if (emailError) logStep('Email connections deletion warning', emailError);

    // 8. Delete subscriptions
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);
    if (subError) logStep('Subscriptions deletion warning', subError);

    // 9. Delete profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (profileError) logStep('Profiles deletion warning', profileError);

    // 10. Delete user_roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    if (rolesError) logStep('User roles deletion warning', rolesError);

    // 11. Delete the auth user using admin API
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      logStep('Auth user deletion failed', authDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete auth user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Account deletion completed', { userId });

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logStep('Unexpected error', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

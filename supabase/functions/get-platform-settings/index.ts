import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS - settings are public data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all non-secret settings
    const { data: settingsRows, error } = await supabase
      .from('platform_settings')
      .select('key, value')
      .eq('is_secret', false);

    if (error) {
      console.error('Error fetching settings:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to key-value object
    const settings: Record<string, string> = {};
    settingsRows?.forEach(row => {
      settings[row.key] = row.value;
    });

    return new Response(
      JSON.stringify({ settings }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

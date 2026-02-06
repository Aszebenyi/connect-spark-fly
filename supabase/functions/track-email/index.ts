import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1x1 transparent GIF
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 
  0x01, 0x00, 0x3b
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const emailLogId = url.searchParams.get('id');
    const trackType = url.searchParams.get('type'); // 'open' or 'click'
    const redirectUrl = url.searchParams.get('url'); // for click tracking

    if (!emailLogId) {
      console.log('No email log ID provided');
      return new Response(TRANSPARENT_GIF, {
        headers: { 
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          ...corsHeaders 
        },
      });
    }

    console.log('Tracking email:', { emailLogId, trackType });

    // Get current email log
    const { data: emailLog, error } = await supabase
      .from('email_log')
      .select('opened_at, clicked_at')
      .eq('id', emailLogId)
      .single();

    if (error) {
      console.error('Error fetching email log:', error);
    }

    // Update based on track type
    if (trackType === 'open' && emailLog && !emailLog.opened_at) {
      const { error: updateError } = await supabase
        .from('email_log')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', emailLogId);

      if (updateError) {
        console.error('Error updating open tracking:', updateError);
      } else {
        console.log('Email open tracked:', emailLogId);
      }
    }

    if (trackType === 'click' && emailLog && !emailLog.clicked_at) {
      const { error: updateError } = await supabase
        .from('email_log')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', emailLogId);

      if (updateError) {
        console.error('Error updating click tracking:', updateError);
      } else {
        console.log('Email click tracked:', emailLogId);
      }
    }

    // For click tracking, redirect to the original URL
    if (trackType === 'click' && redirectUrl) {
      return new Response(null, {
        status: 302,
        headers: { 
          'Location': decodeURIComponent(redirectUrl),
          ...corsHeaders 
        },
      });
    }

    // For open tracking, return transparent pixel
    return new Response(TRANSPARENT_GIF, {
      headers: { 
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...corsHeaders 
      },
    });

  } catch (error: unknown) {
    console.error('Error in track-email:', error);
    
    // Always return the pixel, even on error
    return new Response(TRANSPARENT_GIF, {
      headers: { 
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...corsHeaders 
      },
    });
  }
});

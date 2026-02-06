import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Processing email queue...');

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find queued emails that are ready to send (delay has passed)
    const { data: queuedEmails, error: fetchError } = await supabase
      .from('email_log')
      .select(`
        *,
        email_sequences(delay_minutes)
      `)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('Error fetching queued emails:', fetchError);
      throw fetchError;
    }

    if (!queuedEmails || queuedEmails.length === 0) {
      console.log('No queued emails to process');
      return new Response(
        JSON.stringify({ message: 'No queued emails', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${queuedEmails.length} queued emails`);

    // Fetch email settings once
    const { data: emailSettings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['email_from_name', 'email_from_address']);

    const fromName = emailSettings?.find(s => s.key === 'email_from_name')?.value || 'LeadPulse';
    const fromAddress = emailSettings?.find(s => s.key === 'email_from_address')?.value || 'onboarding@resend.dev';

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const email of queuedEmails) {
      try {
        // Check if delay has passed
        const delayMinutes = email.email_sequences?.delay_minutes || 0;
        const createdAt = new Date(email.created_at);
        const sendAfter = new Date(createdAt.getTime() + delayMinutes * 60 * 1000);
        const now = new Date();

        if (now < sendAfter) {
          console.log(`Email ${email.id} not ready yet (send after: ${sendAfter.toISOString()})`);
          skipped++;
          continue;
        }

        // Add tracking pixel
        const trackingPixel = `<img src="${supabaseUrl}/functions/v1/track-email?id=${email.id}&type=open" width="1" height="1" style="display:none" />`;
        const bodyWithTracking = email.body_sent + trackingPixel;

        // Send via Resend
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${fromName} <${fromAddress}>`,
            to: [email.recipient_email],
            subject: email.subject,
            html: bodyWithTracking,
          }),
        });

        const emailResult = await emailResponse.json();

        if (!emailResponse.ok) {
          console.error(`Failed to send email ${email.id}:`, emailResult);
          await supabase
            .from('email_log')
            .update({ 
              status: 'failed', 
              error_message: emailResult.message || 'Failed to send' 
            })
            .eq('id', email.id);
          errors.push(`Email ${email.id}: ${emailResult.message || 'Failed'}`);
          continue;
        }

        // Update to sent
        await supabase
          .from('email_log')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', email.id);

        console.log(`Email ${email.id} sent successfully`);
        processed++;

      } catch (emailError) {
        console.error(`Error processing email ${email.id}:`, emailError);
        errors.push(`Email ${email.id}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
      }
    }

    console.log(`Queue processing complete: ${processed} sent, ${skipped} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in process-email-queue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

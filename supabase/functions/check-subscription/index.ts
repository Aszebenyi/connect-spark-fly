import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Plan configuration
const PLANS = {
  'prod_TiXHpO8ijpKqTp': { id: 'starter', name: 'Starter', credits: 250 },
  'prod_TiXHO7iMyHkneq': { id: 'growth', name: 'Growth', credits: 1000 },
  'prod_TiXH8Xv4s6tGGb': { id: 'scale', name: 'Scale', credits: 2500 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header provided");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan_id: 'free', 
        plan_name: 'Free', 
        credits_limit: 10, 
        credits_used: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Authentication failed", { error: userError.message });
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan_id: 'free', 
        plan_name: 'Free', 
        credits_limit: 10, 
        credits_used: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, returning free tier");

      // Fetch current row so we can avoid writing when nothing changes
      const { data: existingSub } = await supabaseClient
        .from('subscriptions')
        .select('plan_id, status, credits_limit, credits_used')
        .eq('user_id', user.id)
        .single();

      const creditsUsed = existingSub?.credits_used || 0;
      logStep("Fetched existing credits for free tier", { creditsUsed });

      const needsUpdate =
        !existingSub ||
        existingSub.plan_id !== 'free' ||
        existingSub.status !== 'active' ||
        existingSub.credits_limit !== 10;

      if (needsUpdate) {
        await supabaseClient
          .from('subscriptions')
          .upsert(
            {
              user_id: user.id,
              plan_id: 'free',
              status: 'active',
              credits_limit: 10,
            },
            { onConflict: 'user_id' }
          );
        logStep("Subscription row updated for free tier");
      } else {
        logStep("No changes for free tier, skipping database update");
      }

      return new Response(
        JSON.stringify({
          subscribed: false,
          plan_id: 'free',
          plan_name: 'Free',
          credits_limit: 10,
          credits_used: creditsUsed,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let planId = 'free';
    let planName = 'Free';
    let creditsLimit = 10;
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let resetCredits = false;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
      
      const productId = subscription.items.data[0].price.product as string;
      const planConfig = PLANS[productId as keyof typeof PLANS];
      
      if (planConfig) {
        planId = planConfig.id;
        planName = planConfig.name;
        creditsLimit = planConfig.credits;
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        productId, 
        planId, 
        creditsLimit 
      });

      // Check if this is a new billing period OR plan upgrade (to reset credits)
      const { data: existingSub } = await supabaseClient
        .from('subscriptions')
        .select('current_period_start, credits_used, plan_id')
        .eq('user_id', user.id)
        .single();

      // Reset credits on new billing period
      if (existingSub?.current_period_start && existingSub.current_period_start !== periodStart) {
        logStep("New billing period detected, credits will be reset");
        resetCredits = true;
      }
      
      // Reset credits on plan upgrade (give users fresh start with new plan)
      if (existingSub?.plan_id && existingSub.plan_id !== planId) {
        logStep("Plan change detected, credits will be reset", { 
          from: existingSub.plan_id, 
          to: planId 
        });
        resetCredits = true;
        
        // Trigger subscription activated email for upgrades from free
        if (existingSub.plan_id === 'free' && planId !== 'free') {
          logStep("Triggering subscription_activated email");
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-automated-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              event_type: 'subscription_activated',
              user_id: user.id,
            }),
          }).catch((err) => logStep("Failed to send subscription email", err));
        }
      }
    }

    // Get current credits used from database (unless resetting)
    let creditsUsed = 0;
    if (!resetCredits) {
      const { data: subData } = await supabaseClient
        .from('subscriptions')
        .select('credits_used')
        .eq('user_id', user.id)
        .single();
      creditsUsed = subData?.credits_used || 0;
    }

    // Get the current period start for saving
    const currentPeriodStart = hasActiveSub 
      ? new Date(subscriptions.data[0].current_period_start * 1000).toISOString()
      : null;

    // Update subscription record (ONLY write if something actually changed)
    const desiredStatus = hasActiveSub ? 'active' : 'inactive';

    const desired: Record<string, unknown> = {
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
      plan_id: planId,
      status: desiredStatus,
      credits_limit: creditsLimit,
      current_period_end: subscriptionEnd,
      current_period_start: currentPeriodStart,
    };

    const { data: existingRow } = await supabaseClient
      .from('subscriptions')
      .select(
        'stripe_customer_id, stripe_subscription_id, plan_id, status, credits_limit, credits_used, current_period_end, current_period_start'
      )
      .eq('user_id', user.id)
      .single();

    const desiredCreditsUsed = resetCredits ? 0 : (existingRow?.credits_used ?? creditsUsed);

    const needsUpdate =
      !existingRow ||
      existingRow.stripe_customer_id !== desired.stripe_customer_id ||
      existingRow.stripe_subscription_id !== desired.stripe_subscription_id ||
      existingRow.plan_id !== desired.plan_id ||
      existingRow.status !== desired.status ||
      existingRow.credits_limit !== desired.credits_limit ||
      (existingRow.current_period_end ?? null) !== (desired.current_period_end ?? null) ||
      (existingRow.current_period_start ?? null) !== (desired.current_period_start ?? null) ||
      (resetCredits && existingRow.credits_used !== 0);

    if (needsUpdate) {
      const upsertData: Record<string, unknown> = {
        ...desired,
        updated_at: new Date().toISOString(),
      };

      if (resetCredits) {
        upsertData.credits_used = 0;
      }

      await supabaseClient
        .from('subscriptions')
        .upsert(upsertData, { onConflict: 'user_id' });

      logStep("Subscription data updated in database", { resetCredits });
    } else {
      logStep("No subscription changes detected, skipping database update");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_id: planId,
      plan_name: planName,
      credits_limit: creditsLimit,
      credits_used: creditsUsed,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

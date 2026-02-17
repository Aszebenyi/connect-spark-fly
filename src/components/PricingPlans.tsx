import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PLANS, PlanId } from '@/lib/plans';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface PricingPlansProps {
  onClose?: () => void;
}

export function PricingPlans({ onClose }: PricingPlansProps) {
  const { subscription, session, refreshSubscription } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const isAnnual = billingPeriod === 'annual';

  const handleSubscribe = async (planId: PlanId) => {
    const plan = PLANS[planId];
    const priceId = isAnnual ? plan.annualPriceId : plan.priceId;
    if (!priceId) return;

    setLoadingPlan(planId);
    trackEvent('plan_selected', { planId, billingPeriod });
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, billingPeriod },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPlan('manage');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open billing portal',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const currentPlanId = subscription?.plan_id || 'free';
  const isSubscribed = subscription?.subscribed;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
        <p className="text-muted-foreground mb-6">
          Unlock more leads and grow your business
        </p>

        {/* Billing period toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              !isAnnual
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2',
              isAnnual
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Annual
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-success/15 text-success border border-success/20">
              -20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, plan]) => {
          const isCurrentPlan = currentPlanId === id;
          const isPlanPopular = 'popular' in plan && plan.popular;
          const displayPrice = isAnnual ? plan.annualPrice : plan.price;
          const activePriceId = isAnnual ? plan.annualPriceId : plan.priceId;

          // Per-candidate cost calculation
          const perCandidate = plan.credits > 0 && displayPrice > 0
            ? `~$${(displayPrice / (plan.credits * 10)).toFixed(2)} per candidate`
            : null;

          return (
            <div
              key={id}
              className={cn(
                'relative rounded-2xl p-6 transition-all duration-300',
                'bg-card border',
                isCurrentPlan 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : isPlanPopular
                    ? 'border-primary/50'
                    : 'border-border',
                isPlanPopular && !isCurrentPlan && 'transform scale-105'
              )}
            >
              {isPlanPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-success text-success-foreground">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    ${displayPrice}
                  </span>
                  {displayPrice > 0 && (
                    <span className="text-muted-foreground">/mo</span>
                  )}
                </div>
                {isAnnual && plan.price > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground line-through">${plan.price}/mo</span>
                    <span className="text-xs font-semibold text-success">Save 20%</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.credits.toLocaleString()} leads/month
                </p>
                {perCandidate && (
                  <p className="text-xs text-muted-foreground mt-1">{perCandidate}</p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <svg
                      className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                isSubscribed && id !== 'free' ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={handleManageSubscription}
                    disabled={loadingPlan === 'manage'}
                  >
                    {loadingPlan === 'manage' ? (
                      <div className="apple-spinner w-5 h-5" />
                    ) : (
                      'Manage Subscription'
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full rounded-xl" disabled>
                    Current Plan
                  </Button>
                )
              ) : activePriceId ? (
                <Button
                  className={cn(
                    'w-full rounded-xl',
                    isPlanPopular ? 'apple-button' : ''
                  )}
                  variant={isPlanPopular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(id)}
                  disabled={loadingPlan === id}
                >
                  {loadingPlan === id ? (
                    <div className="apple-spinner w-5 h-5" />
                  ) : (
                    'Upgrade'
                  )}
                </Button>
              ) : (
                <Button variant="outline" className="w-full rounded-xl" disabled>
                  Free Forever
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {isSubscribed && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={handleManageSubscription}
            disabled={loadingPlan === 'manage'}
            className="text-muted-foreground"
          >
            Manage billing & invoices →
          </Button>
        </div>
      )}
    </div>
  );
}

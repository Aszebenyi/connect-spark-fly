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

  const handleSubscribe = async (planId: PlanId) => {
    const plan = PLANS[planId];
    if (!plan.priceId) return;

    setLoadingPlan(planId);
    trackEvent('plan_selected', { planId });
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: plan.priceId },
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
        <p className="text-muted-foreground">
          Unlock more leads and grow your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, plan]) => {
          const isCurrentPlan = currentPlanId === id;
          const isPlanPopular = 'popular' in plan && plan.popular;

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
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/mo</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {plan.credits.toLocaleString()} leads/month
                </p>
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
              ) : plan.priceId ? (
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

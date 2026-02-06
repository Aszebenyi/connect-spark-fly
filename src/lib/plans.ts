// Stripe product and price configuration
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 10,
    priceId: null,
    productId: null,
    features: [
      '10 leads per month',
      'Basic lead search',
      'Email support',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 35,
    credits: 250,
    priceId: 'price_1Sl6DHDp7VRpgnTikwLRt1tw',
    productId: 'prod_TiXHpO8ijpKqTp',
    features: [
      '250 leads per month',
      'AI-powered lead search',
      'LinkedIn enrichment',
      'Email outreach generation',
      'Priority support',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 99,
    credits: 1000,
    priceId: 'price_1Sl6DJDp7VRpgnTi99xkXWPn',
    productId: 'prod_TiXHO7iMyHkneq',
    popular: true,
    features: [
      '1,000 leads per month',
      'Everything in Starter',
      'Advanced filtering',
      'Campaign management',
      'Analytics dashboard',
      'API access',
    ],
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    price: 199,
    credits: 2500,
    priceId: 'price_1Sl6DLDp7VRpgnTiujlSkYLD',
    productId: 'prod_TiXH8Xv4s6tGGb',
    features: [
      '2,500 leads per month',
      'Everything in Growth',
      'Unlimited campaigns',
      'Team collaboration',
      'Custom integrations',
      'Dedicated account manager',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanByProductId(productId: string): typeof PLANS[PlanId] | undefined {
  return Object.values(PLANS).find(plan => plan.productId === productId);
}

export function getPlanById(planId: string): typeof PLANS[PlanId] | undefined {
  return PLANS[planId as PlanId];
}

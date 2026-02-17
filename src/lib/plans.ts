// Stripe product and price configuration
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 5,
    priceId: null,
    productId: null,
    features: [
      '5 searches to try it out',
      'AI-powered candidate search',
      'Email support',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 299,
    credits: 250,
    priceId: 'price_1Sl6DHDp7VRpgnTikwLRt1tw',
    productId: 'prod_TiXHpO8ijpKqTp',
    features: [
      '250 searches per month',
      '~2,500-3,750 qualified candidates',
      'AI-powered candidate search',
      'License & certification verification',
      'Gmail integration',
      'AI-generated email outreach',
      'Job opening management',
      'Email tracking (opens, replies)',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 599,
    credits: 1000,
    priceId: 'price_1Sl6DJDp7VRpgnTi99xkXWPn',
    productId: 'prod_TiXHO7iMyHkneq',
    popular: true,
    features: [
      '1,000 searches per month',
      '~10,000-15,000 qualified candidates',
      'Everything in Starter',
      'Priority enrichment',
      'Advanced candidate filters',
      'Match scoring with AI reasoning',
      'Enhanced email analytics',
      'Multiple job opening management',
      'Weekly performance reports',
    ],
  },
  scale: {
    id: 'scale',
    name: 'Agency',
    price: 999,
    credits: 2500,
    priceId: 'price_1Sl6DLDp7VRpgnTiujlSkYLD',
    productId: 'prod_TiXH8Xv4s6tGGb',
    features: [
      '2,500 searches per month',
      '~25,000-37,500 qualified candidates',
      'Everything in Growth',
      'Dedicated account support',
      'Unlimited job openings',
      'CSV export',
      'Priority support',
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
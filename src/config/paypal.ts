/**
 * PayPal Configuration
 * Plan IDs for subscription payments
 */

export const PAYPAL_CONFIG = {
  // PayPal Client ID (from PayPal Developer Dashboard)
  clientId: 'AR8Tj1Yp6t_r5f6mh2DTSTV4_rdyx3UOOtDf9MpA7l8sWZp2yBtaOj1nJgLegl8pyVJgvNradYcT8iTl',
  
  // Plan IDs
  plans: {
    pro: {
      monthly: 'P-5VT51024VY019790KNF6GONI',
      yearly: 'P-7KH89110L2775610BNF6GSBI',
    },
    team: {
      monthly: 'P-1F450835FL5390748NF6GU7A',
      yearly: 'P-60V61461HB377544PNF6GVVY',
    },
  },
};

/**
 * Get PayPal Plan ID by plan name and billing cycle
 */
export function getPayPalPlanId(planName: string, billingCycle: 'monthly' | 'yearly'): string | null {
  const plan = PAYPAL_CONFIG.plans[planName as keyof typeof PAYPAL_CONFIG.plans];
  if (!plan) return null;
  return plan[billingCycle];
}


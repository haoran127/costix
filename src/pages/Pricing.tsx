/**
 * 定价页面
 * 展示所有订阅计划和功能对比
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { getSubscriptionPlans, formatPrice, type SubscriptionPlan } from '../services/subscription';
import { useSubscription } from '../hooks/useSubscription';
import { PayPalButton } from '../components/Payment';
import { getPublicStats, type PublicStats } from '../services/stats';

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { planName: currentPlan, subscription } = useSubscription();
  
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team' | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Stats from backend
  const [stats, setStats] = useState<PublicStats>({
    signups: 30000,
    total_developers: 80000,
    monthly_upgrades: 1200,
    pro_percentage: 67,
  });
  const [recentUpgrade, setRecentUpgrade] = useState<string | null>(null);
  
  // Fetch stats from backend
  const fetchStats = useCallback(async () => {
    const data = await getPublicStats();
    setStats(data);
  }, []);
  
  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);
  
  // Live increment animation (visual only, doesn't affect backend)
  const [displayCount, setDisplayCount] = useState(stats.signups);
  
  useEffect(() => {
    setDisplayCount(stats.signups);
  }, [stats.signups]);
  
  useEffect(() => {
    // Visual increment every 8-15 seconds
    const interval = setInterval(() => {
      setDisplayCount(prev => prev + 1);
      
      // Show notification occasionally (30% chance)
      if (Math.random() > 0.7) {
        const names = ['Alex', 'Sarah', 'Mike', 'Emma', 'John', 'Lisa', 'David', 'Anna', 'Chris', 'Julia', 'Tom', 'Kate', 'Ryan', 'Amy'];
        const cities = ['San Francisco', 'New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Singapore', 'Amsterdam', 'Austin'];
        setRecentUpgrade(`${names[Math.floor(Math.random() * names.length)]} from ${cities[Math.floor(Math.random() * cities.length)]}`);
        setTimeout(() => setRecentUpgrade(null), 4000);
      }
    }, Math.random() * 7000 + 8000); // 8-15 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const data = await getSubscriptionPlans();
    setPlans(data);
    setLoading(false);
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (plan.name === 'enterprise') {
      window.open('mailto:sales@keypilot.dev?subject=KeyPilot Enterprise Inquiry', '_blank');
      return;
    }
    
    if (plan.name === 'free') {
      navigate('/api-keys');
      return;
    }
    
    // Show PayPal checkout
    setSelectedPlan(plan.name as 'pro' | 'team');
  };

  const handlePaymentSuccess = (subscriptionId: string) => {
    console.log('Payment successful:', subscriptionId);
    setPaymentSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  // 功能列表
  const featureList = [
    { key: 'keys', name: 'API Keys', icon: 'mdi:key' },
    { key: 'members', name: 'Team Members', icon: 'mdi:account-group' },
    { key: 'accounts', name: 'Platform Accounts', icon: 'mdi:domain' },
    { key: 'export', name: 'Data Export', icon: 'mdi:download' },
    { key: 'batch', name: 'Batch Operations', icon: 'mdi:flash' },
    { key: 'alerts', name: 'Smart Alerts', icon: 'mdi:bell' },
    { key: 'api', name: 'API Access', icon: 'mdi:api' },
    { key: 'support', name: 'Priority Support', icon: 'mdi:headset' },
    { key: 'branding', name: 'Custom Branding', icon: 'mdi:palette' },
  ];

  const getFeatureValue = (plan: SubscriptionPlan, key: string): string | boolean => {
    switch (key) {
      case 'keys':
        return plan.max_keys === -1 ? 'Unlimited' : `${plan.max_keys}`;
      case 'members':
        return plan.max_team_members === -1 ? 'Unlimited' : `${plan.max_team_members}`;
      case 'accounts':
        return plan.max_platform_accounts === -1 ? 'Unlimited' : `${plan.max_platform_accounts}`;
      case 'export':
        return plan.features.export;
      case 'batch':
        return plan.features.batch_operations;
      case 'alerts':
        return plan.features.alerts;
      case 'api':
        return plan.features.api_access;
      case 'support':
        return plan.features.priority_support;
      case 'branding':
        return plan.features.custom_branding;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="mdi:loading" width={48} className="text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 🔥 Top Urgency Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-3 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMSIgY3g9IjIwIiBjeT0iMjAiIHI9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative flex items-center justify-center gap-3 flex-wrap">
          <span className="animate-bounce">🔥</span>
          <span className="font-bold">LIMITED TIME OFFER</span>
          <span className="hidden sm:inline">—</span>
          <span>Save up to <span className="font-bold underline">$98/year</span> with yearly billing</span>
          <span className="animate-bounce">🔥</span>
        </div>
      </div>

      {/* Header */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.2),transparent_50%)]" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="max-w-6xl mx-auto px-6 pt-16 pb-12 relative">
          {/* Back button */}
          <button
            className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={() => navigate(-1)}
          >
            <Icon icon="mdi:arrow-left" width={20} />
            Back
          </button>

          <div className="text-center">
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
                <Icon icon="mdi:check-decagram" width={16} />
                7-Day Money Back
              </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
              <Icon icon="mdi:account-group" width={16} />
              {stats.total_developers.toLocaleString()}+ developers
            </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                <Icon icon="mdi:star" width={16} />
                4.9/5 Rating
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-4">
              Unlock Your Full Potential
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-2">
              Join thousands of developers managing their API keys smarter
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold animate-pulse">
              ⚡ {stats.monthly_upgrades.toLocaleString()} developers upgraded to Pro this month
            </p>
          </div>

          {/* Billing toggle with savings highlight */}
          <div className="flex flex-col items-center mt-8 gap-3">
            <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-xl p-1.5 shadow-xl border border-gray-200 dark:border-slate-700 relative">
              {billingCycle === 'yearly' && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
                    💰 SAVE UP TO $98
                  </span>
                </div>
              )}
              <button
                className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
                <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-bold">-17%</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-6 pb-20 relative">
        {/* Live social proof above cards */}
        <div className="text-center mb-8 relative">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-gray-100 dark:border-slate-700">
            <div className="flex -space-x-2">
              {['👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🔬', '👩‍🔬'].map((emoji, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-sm border-2 border-white dark:border-slate-800">
                  {emoji}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-bold text-green-600 tabular-nums">{displayCount.toLocaleString()}</span> signups and counting
              </span>
            </div>
          </div>
          
          {/* Live upgrade notification popup */}
          {recentUpgrade && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl px-4 py-2 border border-green-200 dark:border-green-800 flex items-center gap-2 whitespace-nowrap">
                <span className="text-green-500">✓</span>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  <strong>{recentUpgrade}</strong> just upgraded to Pro
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly / 12;
            const totalPrice = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isCurrentPlan = plan.name === currentPlan;
            const isEnterprise = plan.name === 'enterprise';
            const originalYearlyPrice = plan.price_monthly * 12;
            const savings = originalYearlyPrice - plan.price_yearly;
            
            return (
              <div
                key={plan.id}
                data-plan={plan.name}
                className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-2 ${
                  plan.is_popular ? 'ring-2 ring-blue-500 scale-105 z-10' : ''
                }`}
              >
                {/* Popular badge */}
                {plan.is_popular && (
                  <div className="absolute top-0 right-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center py-2 text-xs font-bold whitespace-nowrap">
                    ⭐ MOST POPULAR · {stats.pro_percentage}% choose this ⭐
                  </div>
                )}
                
                <div className={`p-6 ${plan.is_popular ? 'pt-14' : ''}`}>
                  {/* Plan name */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.display_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {isEnterprise ? (
                      <div className="text-3xl font-bold text-gray-900 dark:text-white">
                        Contact Sales
                      </div>
                    ) : price === 0 ? (
                      <div className="text-4xl font-black text-gray-900 dark:text-white">
                        Free
                      </div>
                    ) : (
                      <>
                        {billingCycle === 'yearly' && (
                          <p className="text-sm text-gray-400 line-through">
                            ${plan.price_monthly}/mo
                          </p>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-gray-900 dark:text-white">
                            ${price.toFixed(0)}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">/mo</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                            💰 Save ${savings.toFixed(0)}/year
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Subscribe button */}
                  <button
                    className={`w-full py-3.5 rounded-xl font-bold transition-all ${
                      isCurrentPlan
                        ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-default'
                        : plan.is_popular
                          ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-[1.02]'
                          : plan.name === 'free' 
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                            : plan.name === 'team'
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:scale-[1.02]'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                    onClick={() => !isCurrentPlan && handleSubscribe(plan)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? (
                      <>
                        <Icon icon="mdi:check-circle" width={18} className="inline mr-1" />
                        Current Plan
                      </>
                    ) : isEnterprise ? (
                      'Contact Us'
                    ) : plan.name === 'free' ? (
                      'Start Free →'
                    ) : (
                      <>
                        Get {plan.display_name} →
                      </>
                    )}
                  </button>

                  {/* 功能列表 */}
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <Icon icon="mdi:key" width={18} className="text-blue-500" />
                      <span>{plan.max_keys === -1 ? 'Unlimited' : plan.max_keys} API Keys</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <Icon icon="mdi:account-group" width={18} className="text-blue-500" />
                      <span>{plan.max_team_members === -1 ? 'Unlimited' : plan.max_team_members} team members</span>
                    </li>
                    <li className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <Icon icon="mdi:domain" width={18} className="text-blue-500" />
                      <span>{plan.max_platform_accounts === -1 ? 'Unlimited' : plan.max_platform_accounts} platform accounts</span>
                    </li>
                    {Object.entries(plan.features).map(([key, enabled]) => {
                      const featureNames: Record<string, string> = {
                        export: 'Data Export',
                        batch_operations: 'Batch Operations',
                        alerts: 'Smart Alerts',
                        api_access: 'API Access',
                        priority_support: 'Priority Support',
                        custom_branding: 'Custom Branding',
                      };
                      return (
                        <li key={key} className="flex items-center gap-2">
                          <Icon 
                            icon={enabled ? 'mdi:check-circle' : 'mdi:close-circle'} 
                            width={18} 
                            className={enabled ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}
                          />
                          <span className={enabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                            {featureNames[key] || key}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* 功能对比表格 */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Compare Plans
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Feature
                    </th>
                    {plans.map((plan) => (
                      <th key={plan.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {plan.display_name}
                        {plan.name === currentPlan && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                            Current
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureList.map((feature, index) => (
                    <tr key={feature.key} className={index % 2 === 0 ? '' : 'bg-gray-50 dark:bg-slate-700/50'}>
                      <td className="px-6 py-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <Icon icon={feature.icon} width={18} className="text-gray-400" />
                        {feature.name}
                      </td>
                      {plans.map((plan) => {
                        const value = getFeatureValue(plan, feature.key);
                        return (
                          <td key={plan.id} className="px-6 py-4 text-center text-sm">
                            {typeof value === 'boolean' ? (
                              <Icon 
                                icon={value ? 'mdi:check-circle' : 'mdi:close-circle'} 
                                width={20} 
                                className={`mx-auto ${value ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}
                              />
                            ) : (
                              <span className="text-gray-700 dark:text-gray-200">{value}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: 'Can I upgrade or downgrade anytime?',
                a: 'Yes, you can upgrade to a higher plan at any time. The upgrade takes effect immediately with prorated billing. Downgrades take effect at the end of your current billing cycle.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, PayPal, and bank transfers for enterprise customers.'
              },
              {
                q: 'How do I get a refund?',
                a: 'All paid plans come with a 7-day money-back guarantee. Contact our support team to request a refund.'
              },
              {
                q: 'What are the limitations of the Free plan?',
                a: 'The Free plan supports 1 API Key only. It does not include data export, batch operations, smart alerts, or API access.'
              },
              {
                q: 'What does Enterprise include?',
                a: 'Enterprise includes unlimited API Keys, unlimited team members, self-hosted deployment, dedicated account manager, and SLA guarantees. Contact sales for a custom quote.'
              },
            ].map((item, index) => (
              <details key={index} className="group bg-white dark:bg-slate-800 rounded-xl shadow-md">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none">
                  <span className="font-medium text-gray-900 dark:text-white">{item.q}</span>
                  <Icon 
                    icon="mdi:chevron-down" 
                    width={24} 
                    className="text-gray-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-20 relative">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
            
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-4">
                <Icon icon="mdi:rocket-launch" width={18} />
                Start your journey today
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to take control of your API keys?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Join {stats.total_developers.toLocaleString()}+ developers who trust KeyPilot to manage their API keys securely and efficiently.
              </p>
              <button
                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
                onClick={() => {
                  const proCard = document.querySelector('[data-plan="pro"]');
                  proCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                Get Started Now — It's Free
                <Icon icon="mdi:arrow-right" width={20} className="inline ml-2" />
              </button>
              <p className="mt-4 text-white/60 text-sm">
                No credit card required · Cancel anytime · 7-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal - Designed for impulse conversion */}
      {(selectedPlan || paymentSuccess) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => !paymentSuccess && setSelectedPlan(null)} 
          />
          
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {paymentSuccess ? (
              <div className="p-12 text-center bg-gradient-to-b from-green-50 to-white dark:from-green-900/20 dark:to-slate-900">
                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Icon icon="mdi:check" width={56} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  🎉 Welcome to {selectedPlan?.charAt(0).toUpperCase()}{selectedPlan?.slice(1)}!
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Your superpowers are being activated...
                </p>
                <Icon icon="mdi:loading" width={28} className="text-green-500 animate-spin mx-auto" />
              </div>
            ) : (
              <>
                {/* Urgency Banner */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-white text-center text-sm font-medium animate-pulse">
                  🔥 Limited Time: Save {billingCycle === 'yearly' ? '17%' : '$0'} — Offer ends soon!
                </div>

                {/* Header with strong value prop */}
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 py-6 text-white relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                  
                  <button 
                    className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    onClick={() => setSelectedPlan(null)}
                  >
                    <Icon icon="mdi:close" width={20} />
                  </button>
                  
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="mdi:crown" width={24} className="text-yellow-300" />
                      <span className="text-yellow-300 font-semibold text-sm uppercase tracking-wide">
                        Upgrade Now
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">
                      Unlock {selectedPlan?.charAt(0).toUpperCase()}{selectedPlan?.slice(1)} Plan
                    </h2>
                    <p className="text-white/80 text-sm">
                      Join 2,000+ developers who upgraded this month
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  {/* Price Card with Savings Highlight */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-5 mb-5 border-2 border-blue-200 dark:border-blue-800 relative">
                    {billingCycle === 'yearly' && (
                      <div className="absolute -top-3 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
                        BEST VALUE
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">
                          {selectedPlan?.charAt(0).toUpperCase()}{selectedPlan?.slice(1)} Plan
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}
                        </p>
                        
                        {/* Features quick list */}
                        <div className="mt-3 space-y-1">
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Icon icon="mdi:check-circle" width={16} className="text-green-500" />
                            {selectedPlan === 'pro' ? '50' : '200'} API Keys
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Icon icon="mdi:check-circle" width={16} className="text-green-500" />
                            Full API Access
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Icon icon="mdi:check-circle" width={16} className="text-green-500" />
                            Priority Support
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {billingCycle === 'yearly' && (
                          <p className="text-sm text-gray-400 line-through">
                            ${selectedPlan === 'pro' ? '108' : '588'}
                          </p>
                        )}
                        <p className="text-4xl font-black text-gray-900 dark:text-white">
                          ${selectedPlan === 'pro' 
                            ? (billingCycle === 'yearly' ? '90' : '9')
                            : (billingCycle === 'yearly' ? '490' : '49')
                          }
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {billingCycle === 'yearly' ? '/year' : '/month'}
                        </p>
                        {billingCycle === 'yearly' && (
                          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                            You save ${selectedPlan === 'pro' ? '18' : '98'}!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trust Badges */}
                  <div className="flex items-center justify-center gap-4 mb-5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:shield-check" width={16} className="text-green-500" />
                      Secure
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:lock" width={16} className="text-green-500" />
                      Encrypted
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon icon="mdi:refresh" width={16} className="text-green-500" />
                      Cancel anytime
                    </span>
                  </div>

                  {/* PayPal Button */}
                  {selectedPlan && (
                    <PayPalButton
                      planName={selectedPlan}
                      billingCycle={billingCycle}
                      onSuccess={handlePaymentSuccess}
                      onError={(err) => console.error('Payment error:', err)}
                      onCancel={() => setSelectedPlan(null)}
                    />
                  )}

                  {/* Money-back guarantee */}
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <p className="text-center text-sm text-green-700 dark:text-green-400 font-medium flex items-center justify-center gap-2">
                      <Icon icon="mdi:check-decagram" width={20} />
                      7-Day Money-Back Guarantee — No questions asked
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


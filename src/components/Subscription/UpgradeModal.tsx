/**
 * Upgrade Subscription Modal
 * Shows upgrade prompt and PayPal payment
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { getSubscriptionPlans, type SubscriptionPlan } from '../../services/subscription';
import { PayPalButton } from '../Payment';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  title?: string;
  description?: string;
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  feature,
  title,
  description 
}: UpgradeModalProps) {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'team' | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      setSelectedPlan(null);
      setPaymentSuccess(false);
    }
  }, [isOpen]);

  const loadPlans = async () => {
    setLoading(true);
    const data = await getSubscriptionPlans();
    setPlans(data.filter(p => p.name !== 'free' && p.name !== 'enterprise'));
    setLoading(false);
  };

  const featureNames: Record<string, string> = {
    export: 'Data Export',
    batch_operations: 'Batch Operations',
    alerts: 'Smart Alerts',
    api_access: 'API Access',
    more_keys: 'More API Keys',
    more_members: 'More Team Members',
  };

  const displayTitle = title || (feature ? `Upgrade to unlock ${featureNames[feature] || feature}` : 'Upgrade to Pro');
  const displayDescription = description || 'Unlock all features and boost your productivity';

  const handlePaymentSuccess = (subscriptionId: string) => {
    console.log('Payment successful:', subscriptionId);
    setPaymentSuccess(true);
    // Reload page after 2 seconds to reflect new subscription
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors z-10"
          onClick={onClose}
        >
          <Icon icon="mdi:close" width={20} className="text-gray-500" />
        </button>

        {/* Payment Success State */}
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
        ) : selectedPlan ? (
          /* Payment Step - Impulse Design */
          <>
            {/* Urgency Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 text-white text-center text-sm font-medium animate-pulse">
              🔥 Limited Time: Save {billingCycle === 'yearly' ? '17%' : '$0'} — Offer ends soon!
            </div>

            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 py-5 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <button 
                className="flex items-center gap-1 text-white/80 hover:text-white mb-2 text-sm"
                onClick={() => setSelectedPlan(null)}
              >
                <Icon icon="mdi:arrow-left" width={18} />
                Back
              </button>
              <div className="flex items-center gap-2 mb-1">
                <Icon icon="mdi:crown" width={22} className="text-yellow-300" />
                <span className="text-yellow-300 font-semibold text-sm uppercase tracking-wide">
                  Upgrade Now
                </span>
              </div>
              <h2 className="text-2xl font-bold">
                Unlock {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Join 50,000+ developers · 67% choose Pro
              </p>
            </div>

            <div className="p-6">
              {/* Price Card with Savings */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-5 mb-5 border-2 border-blue-200 dark:border-blue-800 relative">
                {billingCycle === 'yearly' && (
                  <div className="absolute -top-3 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
                    BEST VALUE
                  </div>
                )}
                
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Icon icon="mdi:check-circle" width={16} className="text-green-500" />
                        {selectedPlan === 'pro' ? '50' : '200'} API Keys
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Icon icon="mdi:check-circle" width={16} className="text-green-500" />
                        Full API Access
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
                    <p className="text-sm text-gray-500">
                      {billingCycle === 'yearly' ? '/year' : '/month'}
                    </p>
                    {billingCycle === 'yearly' && (
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        Save ${selectedPlan === 'pro' ? '18' : '98'}!
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 mb-4 text-xs text-gray-500">
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
              <PayPalButton
                planName={selectedPlan}
                billingCycle={billingCycle}
                onSuccess={handlePaymentSuccess}
                onError={(err) => console.error('Payment error:', err)}
                onCancel={() => console.log('Payment cancelled')}
              />

              {/* Money-back guarantee */}
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <p className="text-center text-sm text-green-700 dark:text-green-400 font-medium flex items-center justify-center gap-2">
                  <Icon icon="mdi:check-decagram" width={18} />
                  7-Day Money-Back Guarantee
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Plan Selection Step */
          <>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon icon="mdi:crown" width={24} />
                </div>
                <h2 className="text-2xl font-bold">{displayTitle}</h2>
              </div>
              <p className="text-white/80">{displayDescription}</p>
            </div>

            <div className="flex justify-center py-4 bg-gray-50 dark:bg-slate-800/50">
              <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-slate-700">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    billingCycle === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    billingCycle === 'yearly'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => setBillingCycle('yearly')}
                >
                  Yearly <span className="text-green-500 ml-1">Save 17%</span>
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Icon icon="mdi:loading" width={32} className="text-gray-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      billingCycle={billingCycle}
                      isPopular={plan.is_popular}
                      onSelect={() => setSelectedPlan(plan.name as 'pro' | 'team')}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>Secure payment via PayPal · 7-day money-back guarantee · Cancel anytime</p>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function PlanCard({ 
  plan, 
  billingCycle, 
  isPopular,
  onSelect,
}: { 
  plan: SubscriptionPlan; 
  billingCycle: 'monthly' | 'yearly';
  isPopular: boolean;
  onSelect: () => void;
}) {
  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly / 12;
  const totalPrice = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;

  const features = [
    { icon: 'mdi:key', text: `${plan.max_keys === -1 ? 'Unlimited' : plan.max_keys} API Keys` },
    { icon: 'mdi:account-group', text: `${plan.max_team_members === -1 ? 'Unlimited' : plan.max_team_members} team members` },
    { icon: 'mdi:download', text: 'Data Export', enabled: plan.features.export },
    { icon: 'mdi:flash', text: 'Batch Operations', enabled: plan.features.batch_operations },
    { icon: 'mdi:bell', text: 'Smart Alerts', enabled: plan.features.alerts },
    { icon: 'mdi:api', text: 'API Access', enabled: plan.features.api_access },
  ];

  return (
    <div className={`relative rounded-xl border-2 p-6 transition-all ${
      isPopular 
        ? 'border-blue-500 shadow-lg shadow-blue-500/10' 
        : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
            Popular
          </span>
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.display_name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
      </div>

      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ${price.toFixed(0)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">/mo</span>
        </div>
        {billingCycle === 'yearly' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ${totalPrice.toFixed(0)}/year · Save ${(plan.price_monthly * 12 - plan.price_yearly).toFixed(0)}
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            <Icon 
              icon={feature.enabled === false ? 'mdi:close' : 'mdi:check'} 
              width={18} 
              className={feature.enabled === false ? 'text-gray-300' : 'text-green-500'}
            />
            <span className={feature.enabled === false ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        className={`w-full py-3 rounded-xl font-medium transition-colors ${
          isPopular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
        }`}
        onClick={onSelect}
      >
        Select Plan
      </button>
    </div>
  );
}

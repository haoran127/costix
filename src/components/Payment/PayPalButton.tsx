/**
 * PayPal Subscription Button Component
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { PAYPAL_CONFIG, getPayPalPlanId } from '../../config/paypal';
import { supabase } from '../../lib/supabase';

interface PayPalButtonProps {
  planName: 'pro' | 'team';
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButton({
  planName,
  billingCycle,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const buttonRendered = useRef(false);

  useEffect(() => {
    // Load PayPal SDK
    const loadPayPalScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.paypal) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&vault=true&intent=subscription`;
        script.setAttribute('data-sdk-integration-source', 'button-factory');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
        document.body.appendChild(script);
      });
    };

    const initPayPal = async () => {
      try {
        await loadPayPalScript();
        
        if (!containerRef.current || buttonRendered.current) return;
        
        const planId = getPayPalPlanId(planName, billingCycle);
        if (!planId) {
          setError('Invalid plan configuration');
          setLoading(false);
          return;
        }

        // Clear container
        containerRef.current.innerHTML = '';
        
        window.paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe',
          },
          createSubscription: function(data: any, actions: any) {
            return actions.subscription.create({
              plan_id: planId,
            });
          },
          onApprove: async function(data: any) {
            console.log('PayPal subscription approved:', data);
            
            // Save subscription to database
            try {
              await saveSubscription(data.subscriptionID, planName, billingCycle);
              onSuccess?.(data.subscriptionID);
            } catch (err) {
              console.error('Failed to save subscription:', err);
              onError?.(err);
            }
          },
          onCancel: function() {
            console.log('PayPal subscription cancelled');
            onCancel?.();
          },
          onError: function(err: any) {
            console.error('PayPal error:', err);
            setError('Payment failed. Please try again.');
            onError?.(err);
          },
        }).render(containerRef.current);

        buttonRendered.current = true;
        setLoading(false);
      } catch (err) {
        console.error('PayPal initialization error:', err);
        setError('Failed to load payment system');
        setLoading(false);
      }
    };

    initPayPal();

    return () => {
      buttonRendered.current = false;
    };
  }, [planName, billingCycle, onSuccess, onError, onCancel]);

  if (error) {
    return (
      <div className="text-center py-4">
        <Icon icon="mdi:alert-circle" width={24} className="text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-600">{error}</p>
        <button 
          className="mt-2 text-sm text-blue-600 hover:underline"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Icon icon="mdi:loading" width={24} className="text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading payment...</span>
        </div>
      )}
      <div ref={containerRef} className={loading ? 'hidden' : ''} />
    </div>
  );
}

/**
 * Save subscription to database
 */
async function saveSubscription(
  paypalSubscriptionId: string,
  planName: string,
  billingCycle: 'monthly' | 'yearly'
) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get plan ID from database
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single();

  if (planError || !plan) {
    throw new Error('Plan not found');
  }

  // Calculate subscription period
  const now = new Date();
  const periodEnd = new Date(now);
  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  // Upsert subscription
  const { error: subError } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: user.id,
      plan_id: plan.id,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: 'paypal',
      payment_subscription_id: paypalSubscriptionId,
      updated_at: now.toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (subError) {
    throw subError;
  }

  // Record payment
  const { data: planDetails } = await supabase
    .from('subscription_plans')
    .select('price_monthly, price_yearly')
    .eq('name', planName)
    .single();

  const amount = billingCycle === 'monthly' 
    ? planDetails?.price_monthly 
    : planDetails?.price_yearly;

  await supabase.from('payment_records').insert({
    user_id: user.id,
    amount: amount || 0,
    currency: 'USD',
    status: 'succeeded',
    payment_provider: 'paypal',
    payment_intent_id: paypalSubscriptionId,
    payment_method: 'paypal',
    description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan - ${billingCycle}`,
    paid_at: now.toISOString(),
  });
}


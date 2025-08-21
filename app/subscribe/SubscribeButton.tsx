'use client';
import { useEffect, useRef } from 'react';

export default function SubscribeButton() {
  const ref = useRef<HTMLDivElement>(null);
  const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;

  useEffect(() => {
    // @ts-ignore
    const paypal = (window as any).paypal;
    if (!paypal || !planId || !ref.current) return;

    ref.current.innerHTML = '';

    paypal.Buttons({
      style: { shape: 'rect', label: 'subscribe' },
      createSubscription: (_data: any, actions: any) => {
        return actions.subscription.create({
          plan_id: planId
        });
      },
      onApprove: async (data: any) => {
        try {
          // data.subscriptionID
          const res = await fetch('/api/paypal/subscriptions/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionID: data.subscriptionID })
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.error || 'Activation failed');
          alert('Subscription activated. 250 credits added!');
        } catch (e: any) {
          alert(e.message || 'Activation failed');
        }
      },
      onError: (err: any) => {
        console.error('PayPal subscription error', err);
        alert('Payment error. Please try again.');
      }
    }).render(ref.current);
  }, [planId]);

  return <div ref={ref} />;
}
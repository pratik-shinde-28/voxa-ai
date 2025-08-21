'use client';
import { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk } from '@/lib/paypal/load-sdk';

export default function SubscribeButton() {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const planId = (process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || '').trim();

  useEffect(() => {
    let cancelled = false;

    if (!planId) {
      setErr('PayPal Plan ID missing. Set NEXT_PUBLIC_PAYPAL_PLAN_ID.');
      return;
    }

    loadPayPalSdk()
      .then((paypal) => {
        if (cancelled || !ref.current) return;
        if (!paypal?.Buttons) {
          setErr('PayPal Buttons unavailable');
          return;
        }
        ref.current.innerHTML = '';
        try {
          paypal.Buttons({
            style: { shape: 'rect', label: 'subscribe' },
            createSubscription: (_data: any, actions: any) => {
              return actions.subscription.create({ plan_id: planId });
            },
            onApprove: async (data: any) => {
              try {
                const res = await fetch('/api/paypal/subscriptions/activate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscriptionID: data.subscriptionID }),
                  cache: 'no-store',
                });
                const j = await res.json();
                if (!res.ok) throw new Error(j?.error || 'Activation failed');
                alert('Subscription activated. 250 credits added!');
              } catch (e: any) {
                setErr(e?.message || 'Activation failed');
              }
            },
            onError: (e: any) => {
              console.error('PayPal subscription error', e);
              setErr('PayPal error. Please try again.');
            },
          }).render(ref.current);
        } catch (e: any) {
          console.error('Subscribe render failed', e);
          setErr(e?.message || 'PayPal render failed');
        }
        setReady(true);
      })
      .catch((e: Error) => setErr(e.message));

    return () => { cancelled = true; };
  }, [planId]);

  if (err) {
    return <div className="rounded-xl border border-red-800 p-4 text-sm text-red-600">{err}</div>;
  }

  return (
    <div ref={ref}>
      {!ready && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
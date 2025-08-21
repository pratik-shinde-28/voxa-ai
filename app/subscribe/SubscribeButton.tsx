'use client';
import { useEffect, useRef, useState } from 'react';

function loadPayPalSdkOnce(): Promise<any> {
  const clientId = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim();
  if (!clientId) return Promise.reject(new Error('PayPal client ID missing'));

  const EXISTING = document.getElementById('paypal-sdk-unified') as HTMLScriptElement | null;
  if (EXISTING) {
    if ((window as any).paypal) return Promise.resolve((window as any).paypal);
    return new Promise((resolve, reject) => {
      EXISTING.addEventListener('load', () => resolve((window as any).paypal));
      EXISTING.addEventListener('error', () => reject(new Error('PayPal SDK failed')));
    });
  }

  const s = document.createElement('script');
  s.id = 'paypal-sdk-unified';
  s.src =
    `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
    `&components=buttons,subscriptions&currency=USD&vault=true&intent=subscription`;
  s.async = true;

  const p = new Promise<any>((resolve, reject) => {
    s.onload = () => resolve((window as any).paypal);
    s.onerror = () => reject(new Error('PayPal SDK failed'));
  });

  document.head.appendChild(s);
  return p;
}

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

    loadPayPalSdkOnce()
      .then((paypal) => {
        if (cancelled || !ref.current) return;

        ref.current.innerHTML = '';

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
              });
              const j = await res.json();
              if (!res.ok) throw new Error(j?.error || 'Activation failed');
              alert('Subscription activated. 250 credits added!');
            } catch (e: any) {
              alert(e.message || 'Activation failed');
            }
          },
          onError: (e: any) => {
            console.error('PayPal subscription error', e);
            alert('Payment error. Please try again.');
          }
        }).render(ref.current);

        setReady(true);
      })
      .catch((e: Error) => setErr(e.message));

    return () => { cancelled = true; };
  }, [planId]);

  if (err) {
    return (
      <div className="rounded-xl border p-4 text-sm text-red-600">
        {err}
      </div>
    );
  }

  return (
    <div ref={ref}>
      {!ready && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
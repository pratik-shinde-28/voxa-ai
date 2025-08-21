'use client';

import { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk } from '@/lib/paypal/loadSdk';

type Props = { clientId: string; planId: string; userId: string };

export default function SubscribeButton({ clientId, planId, userId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      setErr(null);
      try {
        const paypal = await loadPayPalSdk({
          clientId,
          // Same union params as credits page, so the SDK is identical across SPA
          components: 'buttons',
          currency: 'USD',
          intent: 'subscription',
          vault: true,
        });

        if (!ref.current) return;

        const btn = paypal.Buttons({
          style: { layout: 'vertical', label: 'subscribe' },
          createSubscription: (_data: any, actions: any) => {
            return actions.subscription.create({ plan_id: planId });
          },
          onApprove: (data: any) => {
            const subId = data.subscriptionID as string;
            const u = encodeURIComponent(userId || '');
            window.location.href = `/paypal/subscribed?subscription_id=${subId}&u=${u}`;
          },
          onError: (e: any) => {
            console.error('PayPal Subscription error', e);
            setErr('PayPal subscription failed to initialize. Check plan ID and currency.');
          },
        });

        btn.render(ref.current).then(() => {
          if (!destroyed) setReady(true);
        }).catch((e: any) => {
          console.error('PayPal render failed', e);
          if (!destroyed) setErr('PayPal failed to render. Reload and try again.');
        });
      } catch (e: any) {
        console.error(e);
        if (!destroyed) setErr(e.message || 'PayPal SDK failed');
      }
    }

    init();
    return () => { destroyed = true; };
  }, [clientId, planId, userId]);

  return (
    <div>
      <div ref={ref} />
      {!ready && !err && <div className="mt-2 text-xs text-gray-500">Loading PayPal…</div>}
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
    </div>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk } from '@/lib/paypal/loadSdk';

type Props = { packId: 'pack5' | 'pack10' | 'pack30'; userId: string; clientId: string };

// Minimal data shape PayPal passes to onApprove for Orders
type OrderApproveData = {
  orderID?: string;
};

export default function PayPalBuyButtons({ packId, userId, clientId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      setErr(null);
      try {
        const paypal = await loadPayPalSdk({
          clientId,
          // Keep these identical across the app to avoid SDK conflicts
          components: 'buttons',
          currency: 'USD',
          intent: 'subscription',
          vault: true,
        });
        if (destroyed || !containerRef.current) return;

        const btn = paypal.Buttons({
          style: { layout: 'vertical', label: 'buynow' },
          createOrder: async () => {
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pack: packId }),
            });
            const j = await res.json();
            if (!res.ok || !j.id) throw new Error(j?.error || 'Failed to create order');
            return j.id as string;
          },
          onApprove: async (data: OrderApproveData) => {
            const orderID = data.orderID ?? '';
            const u = encodeURIComponent(userId || '');
            if (!orderID) {
              setErr('Order ID missing from PayPal response.');
              return;
            }
            // Redirect to capture handler page
            window.location.href = `/paypal/return?token=${orderID}&pack=${packId}&u=${u}`;
          },
          onError: (e: unknown) => {
            console.error('PayPal Buttons error', e);
            setErr('PayPal could not start checkout. Check merchant currency and client ID.');
          },
        });

        btn
          .render(containerRef.current)
          .then(() => {
            if (!destroyed) setReady(true);
          })
          .catch((e: unknown) => {
            console.error('PayPal render failed', e);
            if (!destroyed) setErr('PayPal failed to render. Reload and try again.');
          });
      } catch (e: unknown) {
        console.error(e);
        if (!destroyed) setErr((e as Error).message || 'PayPal SDK failed');
      }
    }

    init();
    return () => {
      destroyed = true;
    };
  }, [clientId, packId, userId]);

  return (
    <div>
      <div ref={containerRef} />
      {!ready && !err && <div className="mt-2 text-xs text-gray-500">Loading PayPal…</div>}
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
    </div>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk } from '@/lib/paypal/loadSdk';

type Props = { packId: 'pack5' | 'pack10' | 'pack30'; userId: string; clientId: string };

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
          // Always the SAME union options for all pages, so SPA never double-loads with different params
          components: 'buttons',
          currency: 'USD',
          intent: 'subscription',
          vault: true,
        });
        if (destroyed) return;

        // Render the button
        if (!containerRef.current) return;

        const btn = paypal.Buttons({
          style: { layout: 'vertical', label: 'buynow' },
          createOrder: async () => {
            // Create order on your server
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pack: packId }),
            });
            const j = await res.json();
            if (!res.ok || !j.id) throw new Error(j?.error || 'Failed to create order');
            return j.id as string;
          },
          onApprove: async (data) => {
            const orderID = (data as any).orderID as string;
            // Redirect to capture handler page
            const u = encodeURIComponent(userId || '');
            window.location.href = `/paypal/return?token=${orderID}&pack=${packId}&u=${u}`;
          },
          onError: (e: any) => {
            console.error('PayPal Buttons error', e);
            setErr('PayPal could not start checkout. Check merchant currency and client ID.');
          },
        });

        btn.render(containerRef.current).then(() => {
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
  }, [clientId, packId, userId]);

  return (
    <div>
      <div ref={containerRef} />
      {!ready && !err && (
        <div className="mt-2 text-xs text-gray-500">Loading PayPal…</div>
      )}
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
    </div>
  );
}
'use client';
import { useEffect, useRef, useState } from 'react';
import { loadPayPalSdk } from '@/lib/paypal/load-sdk';

type PackKey = 'pack5' | 'pack10' | 'pack30';

export default function PayPalBuyButtons() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ref5  = useRef<HTMLDivElement>(null);
  const ref10 = useRef<HTMLDivElement>(null);
  const ref30 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    loadPayPalSdk()
      .then((paypal) => {
        if (cancelled) return;
        if (!paypal?.Buttons) {
          setErr('PayPal Buttons unavailable');
          return;
        }

        const mount = (el: HTMLDivElement | null, pack: PackKey) => {
          if (!el) return;
          el.innerHTML = '';
          try {
            const btn = paypal.Buttons({
              style: { shape: 'rect', label: 'buynow' },
              createOrder: async () => {
                const res = await fetch('/api/paypal/create-order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pack }),
                  cache: 'no-store',
                });
                const j = await res.json();
                if (!res.ok || !j.id) throw new Error(j?.error || 'create-order failed');
                return j.id;
              },
              onApprove: async (data: any, actions: any) => {
                await actions.order.capture();
                const verify = await fetch('/api/paypal/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderID: data.orderID }),
                  cache: 'no-store',
                });
                const j = await verify.json();
                if (!verify.ok) alert(j?.error || 'Verify failed');
                else alert('Credits added!');
              },
              onError: (e: any) => {
                console.error('PayPal error', e);
                setErr('PayPal error. Please refresh and try again.');
              },
            });
            // Render can throw; wrap it
            try { btn.render(el); } catch (e: any) {
              console.error('Buttons render failed', e);
              setErr(e?.message || 'PayPal render failed');
            }
          } catch (e: any) {
            console.error('Buttons init failed', e);
            setErr(e?.message || 'PayPal init failed');
          }
        };

        mount(ref5.current,  'pack5');
        mount(ref10.current, 'pack10');
        mount(ref30.current, 'pack30');
        setReady(true);
      })
      .catch((e: Error) => setErr(e.message));

    return () => { cancelled = true; };
  }, []);

  if (err) return <div className="rounded-xl border border-red-800 p-4 text-sm text-red-600">PayPal error: {err}</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">5 credits</div>
        <div className="mt-1 text-2xl">$5</div>
        <div className="mt-4" ref={ref5}>{!ready && <div className="text-sm text-gray-500">Loading…</div>}</div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">10 credits</div>
        <div className="mt-1 text-2xl">$10</div>
        <div className="mt-4" ref={ref10}>{!ready && <div className="text-sm text-gray-500">Loading…</div>}</div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">30 credits</div>
        <div className="mt-1 text-2xl">$25</div>
        <div className="mt-4" ref={ref30}>{!ready && <div className="text-sm text-gray-500">Loading…</div>}</div>
      </div>
    </div>
  );
}
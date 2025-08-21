'use client';
import { useEffect, useRef, useState } from 'react';

type PackKey = 'pack5' | 'pack10' | 'pack30';

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
  s.crossOrigin = 'anonymous';
  s.referrerPolicy = 'no-referrer-when-downgrade';

  const p = new Promise<any>((resolve, reject) => {
    s.onload = () => resolve((window as any).paypal);
    s.onerror = () => reject(new Error('PayPal SDK failed'));
  });

  document.head.appendChild(s);
  return p;
}

export default function PayPalBuyButtons() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ref5 = useRef<HTMLDivElement>(null);
  const ref10 = useRef<HTMLDivElement>(null);
  const ref30 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    loadPayPalSdkOnce()
      .then((paypal) => {
        if (cancelled) return;

        function mount(container: HTMLDivElement | null, pack: PackKey) {
          if (!container) return;
          container.innerHTML = '';
          paypal.Buttons({
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
              else alert('Credits added! You can start creating jobs.');
            },
            onError: (e: any) => {
              console.error('PayPal error', e);
              alert('Payment error. Please try again.');
            },
          }).render(container);
        }

        mount(ref5.current, 'pack5');
        mount(ref10.current, 'pack10');
        mount(ref30.current, 'pack30');
        setReady(true);
      })
      .catch((e: Error) => setErr(e.message));

    return () => { cancelled = true; };
  }, []);

  if (err) {
    return (
      <div className="rounded-xl border border-red-800 p-4 text-sm text-red-600">
        PayPal error: {err}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">5 credits</div>
        <div className="mt-1 text-2xl">$5</div>
        <div className="mt-4" ref={ref5}>
          {!ready && <div className="text-sm text-gray-500">Loading…</div>}
        </div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">10 credits</div>
        <div className="mt-1 text-2xl">$10</div>
        <div className="mt-4" ref={ref10}>
          {!ready && <div className="text-sm text-gray-500">Loading…</div>}
        </div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">30 credits</div>
        <div className="mt-1 text-2xl">$25</div>
        <div className="mt-4" ref={ref30}>
          {!ready && <div className="text-sm text-gray-500">Loading…</div>}
        </div>
      </div>
    </div>
  );
}
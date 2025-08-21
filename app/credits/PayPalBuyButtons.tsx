'use client';
import { useEffect, useRef } from 'react';

type PackKey = 'pack5' | 'pack10' | 'pack30';

export default function PayPalBuyButtons() {
  const ref5 = useRef<HTMLDivElement>(null);
  const ref10 = useRef<HTMLDivElement>(null);
  const ref30 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // @ts-ignore
    const paypal = (window as any).paypal;
    if (!paypal) return;

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
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.error || 'create-order failed');
          return j.id; // PayPal order id
        },
        onApprove: async (data: any, actions: any) => {
          await actions.order.capture(); // capture on client
          const verify = await fetch('/api/paypal/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID }),
          });
          const j = await verify.json();
          if (!verify.ok) alert(j?.error || 'Verify failed');
          else alert('Credits added! You can start creating jobs.');
        },
        onError: (err: any) => {
          console.error('PayPal error', err);
          alert('Payment error. Please try again.');
        },
      }).render(container);
    }

    mount(ref5.current, 'pack5');
    mount(ref10.current, 'pack10');
    mount(ref30.current, 'pack30');
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">5 credits</div>
        <div className="mt-1 text-2xl">$5</div>
        <div className="mt-4" ref={ref5} />
      </div>
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">10 credits</div>
        <div className="mt-1 text-2xl">$10</div>
        <div className="mt-4" ref={ref10} />
      </div>
      <div className="rounded-2xl border p-4">
        <div className="text-lg font-medium">30 credits</div>
        <div className="mt-1 text-2xl">$25</div>
        <div className="mt-4" ref={ref30} />
      </div>
    </div>
  );
}
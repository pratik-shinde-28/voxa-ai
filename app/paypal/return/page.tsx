'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PayPalReturnPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Finishing payment…');

  useEffect(() => {
    const orderID = sp.get('token');      // PayPal returns ?token=<orderId>
    const pack    = sp.get('pack') || '';
    const user_id = sp.get('u') || '';
    if (!orderID || !pack || !user_id) {
      setMsg('Missing payment data.');
      return;
    }

    (async () => {
      const res = await fetch('/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID, pack, user_id }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j?.error || 'Capture failed.');
        return;
      }
      setMsg('Payment complete. Credits added!');
      setTimeout(() => router.push('/dashboard'), 1200);
    })();
  }, [sp, router]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">PayPal</h1>
      <p className="mt-2">{msg}</p>
    </main>
  );
}
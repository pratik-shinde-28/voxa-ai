'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function ReturnClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Finishing payment…');

  useEffect(() => {
    const orderID = sp.get('token');           // PayPal returns ?token=<orderId>
    const pack = sp.get('pack') || '';
    const user_id = sp.get('u') || '';

    if (!orderID || !pack || !user_id) {
      setMsg('Missing payment data.');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/paypal/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderID, pack, user_id }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || 'Capture failed.');
        setMsg('Payment complete. Credits added!');
        setTimeout(() => router.push('/dashboard'), 1200);
      } catch (e: any) {
        setMsg(e.message || 'Capture failed.');
      }
    })();
  }, [sp, router]);

  return <p className="mt-2">{msg}</p>;
}
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function SubscribedClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Finalizing subscription…');

  useEffect(() => {
    const subscriptionID =
      sp.get('subscription_id') || sp.get('ba_token') || sp.get('token');
    const user_id = sp.get('u') || '';

    if (!subscriptionID || !user_id) {
      setMsg('Missing subscription data.');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/paypal/subscriptions/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionID, user_id }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || 'Activation failed.');
        setMsg('Subscription active. 250 credits added!');
        setTimeout(() => router.push('/dashboard'), 1200);
      } catch (e: any) {
        setMsg(e.message || 'Activation failed.');
      }
    })();
  }, [sp, router]);

  return <p className="mt-2">{msg}</p>;
}
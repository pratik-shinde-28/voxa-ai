'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PayPalSubscribedPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Finalizing subscription…');

  useEffect(() => {
    const subscriptionID = sp.get('subscription_id') || sp.get('ba_token') || sp.get('token');
    const user_id = sp.get('u') || '';
    if (!subscriptionID || !user_id) {
      setMsg('Missing subscription data.');
      return;
    }
    (async () => {
      const res = await fetch('/api/paypal/subscriptions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionID, user_id }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j?.error || 'Activation failed.');
        return;
      }
      setMsg('Subscription active. 250 credits added!');
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
import dynamic from 'next/dynamic';

const SubscribeButton = dynamic(() => import('./SubscribeButton'), {
  ssr: false,
  loading: () => <div className="rounded-xl border p-4 text-sm text-gray-500">Loading PayPal…</div>,
});

export default function SubscribePage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Subscribe to Voxa Pro</h1>
      <p className="mt-2 text-gray-600">
        $199/month for 250 article credits. Unused credits roll over up to 250.
      </p>
      <div className="mt-6">
        <SubscribeButton />
      </div>
    </main>
  );
}
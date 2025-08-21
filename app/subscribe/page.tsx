import Script from 'next/script';
import SubscribeButton from './SubscribeButton';

export default function SubscribePage() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Subscribe to Voxa Pro</h1>
      <p className="mt-2 text-gray-600">
        $199/month for 250 article credits. Unused credits roll over up to 250.
      </p>

      {!clientId ? (
        <div className="mt-6 rounded-xl border p-4 text-sm">
          <div className="font-medium">PayPal not configured</div>
          <p className="mt-1 text-gray-600">
            Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> and <code>NEXT_PUBLIC_PAYPAL_PLAN_ID</code>, then redeploy.
          </p>
        </div>
      ) : (
        <>
          <Script
            src={`https://www.paypal.com/sdk/js?client-id=${clientId}&components=subscriptions&vault=true&intent=subscription`}
            strategy="afterInteractive"
          />
          <div className="mt-6">
            <SubscribeButton />
          </div>
        </>
      )}
    </main>
  );
}
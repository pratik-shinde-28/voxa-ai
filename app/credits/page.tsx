import Link from 'next/link';
import Script from 'next/script';
import PayPalBuyButtons from './PayPalBuyButtons';

export default function CreditsPage() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Buy Credits</h1>
      <p className="mt-2 text-gray-600">
        Credits are pay as you go. 1 credit = 1 article draft.
      </p>

      {!clientId ? (
        <div className="mt-6 rounded-xl border p-4 text-sm">
          <div className="font-medium">PayPal not configured</div>
          <p className="mt-1 text-gray-600">
            Set <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> in your environment variables, then redeploy.
          </p>
        </div>
      ) : (
        <>
          {/* Load PayPal SDK */}
          <Script
            src={`https://www.paypal.com/sdk/js?client-id=${clientId}&components=buttons&currency=USD`}
            strategy="afterInteractive"
          />
          {/* Buttons for 5 / 10 / 30 credits */}
          <div className="mt-6">
            <PayPalBuyButtons />
          </div>
        </>
      )}

      <div className="mt-8 rounded-2xl border p-4">
        <div className="font-medium">Need more volume?</div>
        <p className="mt-1 text-sm text-gray-600">
          Check out our <Link href="/subscribe" className="underline">Pro plan</Link> for 250 articles/month.
        </p>
      </div>
    </main>
  );
}
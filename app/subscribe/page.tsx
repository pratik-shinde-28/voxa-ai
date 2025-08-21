export default function SubscribePage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Subscribe to Voxa Pro</h1>
      <p className="mt-2 text-gray-600">
        $199/month for 250 article credits. Unused credits roll over up to 250.
      </p>

      <a
        href="/api/paypal/subscribe"
        className="mt-6 inline-block rounded-xl border px-4 py-2 hover:bg-gray-50"
      >
        Subscribe with PayPal
      </a>
    </main>
  );
}
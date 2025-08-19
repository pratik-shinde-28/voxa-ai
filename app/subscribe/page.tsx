export default function SubscribePage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Subscribe</h1>
      <p className="mt-2 text-gray-600">
        Pro: $199/month for 250 articles. Rollover up to 250 unused credits.
      </p>
      <div className="mt-4 rounded-2xl border p-4">
        <button disabled className="rounded-lg border px-4 py-2 opacity-60" title="Coming soon">
          Subscribe with PayPal (soon)
        </button>
      </div>
    </main>
  );
}
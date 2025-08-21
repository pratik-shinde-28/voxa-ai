import Link from 'next/link';

const packs = [
  { id: 'pack5',  label: '5 credits',  price: '$5'  },
  { id: 'pack10', label: '10 credits', price: '$10' },
  { id: 'pack30', label: '30 credits', price: '$25' },
];

export default function CreditsPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Buy Credits</h1>
      <p className="mt-2 text-gray-600">Credits are pay as you go. 1 credit = 1 article draft.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {packs.map((p) => (
          <div key={p.id} className="rounded-2xl border p-4">
            <div className="text-lg font-medium">{p.label}</div>
            <div className="mt-1 text-2xl">{p.price}</div>
            <a
              href={`/api/paypal/buy?pack=${p.id}`}
              className="mt-4 inline-block w-full rounded-lg border px-3 py-2 text-center hover:bg-gray-50"
            >
              Pay with PayPal
            </a>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border p-4">
        <div className="font-medium">Need more volume?</div>
        <p className="mt-1 text-sm text-gray-600">
          Check out our <Link href="/subscribe" className="underline">Pro plan</Link> for 250 articles/month.
        </p>
      </div>
    </main>
  );
}
import Link from 'next/link';
import { createServer } from '@/lib/supabase/server';
import PayPalBuyButtons from './PayPalBuyButtons';

type PackId = 'pack5' | 'pack10' | 'pack30';
type Pack = { id: PackId; label: string; price: string; desc: string };

const packs: Pack[] = [
  { id: 'pack5',  label: '5 credits',  price: '$5',  desc: 'Good for a quick test' },
  { id: 'pack10', label: '10 credits', price: '$10', desc: 'For small batches' },
  { id: 'pack30', label: '30 credits', price: '$25', desc: 'Best value' },
];

export default async function CreditsPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Buy Credits</h1>
      <p className="mt-2 text-gray-600">
        Credits are pay as you go. 1 credit = 1 article draft.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {packs.map((p) => (
          <div key={p.id} className="rounded-2xl border p-4">
            <div className="text-lg font-medium">{p.label}</div>
            <div className="mt-1 text-2xl">{p.price}</div>
            <div className="mt-1 text-sm text-gray-600">{p.desc}</div>

            <div className="mt-4">
              <PayPalBuyButtons
                packId={p.id}
                userId={user?.id || ''}
                clientId={clientId}
              />
            </div>
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
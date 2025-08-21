import { Suspense } from 'react';
import ReturnClient from './ReturnClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PayPalReturnPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">PayPal</h1>
      <Suspense fallback={<p className="mt-2">Finishing payment…</p>}>
        <ReturnClient />
      </Suspense>
    </main>
  );
}
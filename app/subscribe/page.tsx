import { createServer } from '@/lib/supabase/server';
import SubscribeButton from './SubscribeButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SubscribePage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const planId = process.env.PAYPAL_PLAN_ID || '';

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Voxa Pro — $199/mo</h1>
      <p className="mt-2 text-gray-600">250 article credits each month. Rollover up to 250.</p>

      <div className="mt-6">
        <SubscribeButton clientId={clientId} planId={planId} userId={user?.id || ''} />
      </div>
    </main>
  );
}
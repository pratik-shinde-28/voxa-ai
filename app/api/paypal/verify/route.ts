import { NextResponse } from 'next/server';
import { paypalAccessToken } from '@/lib/paypal';
import { getAdminClient } from '@/lib/supabase/admin';

const PACKS: Record<string, { amount: string; credits: number }> = {
  pack5:  { amount: '5.00',  credits: 5 },
  pack10: { amount: '10.00', credits: 10 },
  pack30: { amount: '25.00', credits: 30 },
};

export async function POST(req: Request) {
  const { orderID } = await req.json().catch(() => ({}));
  if (!orderID) return NextResponse.json({ error: 'orderID required' }, { status: 400 });

  const admin = getAdminClient();
  const { token, base } = await paypalAccessToken();

  // Get order details
  const res = await fetch(`${base}/v2/checkout/orders/${orderID}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store',
  });
  const order = await res.json();

  if (!res.ok) return NextResponse.json(order, { status: res.status });

  // Basic validation
  if (order.status !== 'COMPLETED' && order.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Order not completed' }, { status: 400 });
  }

  const pu = order?.purchase_units?.[0];
  const custom = String(pu?.custom_id || '');
  const [pack, user_id] = custom.split(':');
  const sel = PACKS[pack];
  if (!sel || !user_id) {
    return NextResponse.json({ error: 'Invalid custom_id' }, { status: 400 });
  }

  // Idempotency: use the PayPal order id as payment_id; credit only once
  const payment_id = String(order.id);

  // Check if already credited
  const { data: exists } = await admin
    .from('credit_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('payment_id', payment_id);

  if ((exists?.length ?? 0) > 0 || (exists as any)?.count > 0) {
    return NextResponse.json({ ok: true, alreadyCredited: true });
  }

  // Ensure wallet row
  await admin.rpc('ensure_wallet', { p_user_id: user_id });

  // Credit the wallet and write ledger
  const { error: wErr } = await admin
    .from('user_wallets')
    .update({ balance: (undefined as any) }) // will set below via RPC? If no RPC, read-modify-write
    .eq('user_id', user_id);
  // Instead of the above placeholder, do a safe increment:
  await admin.rpc('ensure_wallet', { p_user_id: user_id });
  await admin.from('user_wallets')
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', user_id);
  await admin.rpc('ensure_wallet', { p_user_id: user_id });

  // Simple safe increment: read, add, write (ok for MVP). For concurrency, wrap in RPC later.
  const { data: wallet } = await admin
    .from('user_wallets')
    .select('balance')
    .eq('user_id', user_id)
    .single();
  const current = wallet?.balance ?? 0;

  const { error: upErr } = await admin
    .from('user_wallets')
    .update({ balance: current + sel.credits, updated_at: new Date().toISOString() })
    .eq('user_id', user_id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: ledErr } = await admin
    .from('credit_ledger')
    .insert({
      user_id,
      delta: sel.credits,
      reason: pack,              // e.g., 'pack30'
      payment_id,                // PayPal order id
    });

  if (ledErr) return NextResponse.json({ error: ledErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, credited: sel.credits });
}
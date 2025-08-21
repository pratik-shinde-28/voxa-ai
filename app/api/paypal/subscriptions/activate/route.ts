import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { paypalAccessToken } from '@/lib/paypal';

// 'YYYY-MM' formatter
function periodKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

export async function POST(req: Request) {
  const supa = await createServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { subscriptionID } = await req.json().catch(() => ({}));
  if (!subscriptionID) return NextResponse.json({ error: 'subscriptionID required' }, { status: 400 });

  const admin = getAdminClient();
  const { token, base } = await paypalAccessToken();

  // Get subscription details from PayPal
  const subResp = await fetch(`${base}/v1/billing/subscriptions/${subscriptionID}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  const sub = await subResp.json();
  if (!subResp.ok) return NextResponse.json(sub, { status: subResp.status });

  const status = String(sub.status || '');
  const plan_id = String(sub.plan_id || process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || '');
  const product_id = String(sub.plan_overridden ? '' : sub.plan_id || '');

  // Only proceed if ACTIVE (or APPROVAL_PENDING that later flips via webhook; MVP requires ACTIVE)
  if (status !== 'ACTIVE') {
    return NextResponse.json({ error: `Subscription not ACTIVE (status=${status})` }, { status: 400 });
  }

  // Upsert subscription row for this user
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id, last_credited_period')
    .eq('paypal_subscription_id', subscriptionID)
    .maybeSingle();

  const nowPeriod = periodKey();

  if (!existing) {
    // create row
    const { error: insErr } = await admin.from('subscriptions').insert({
      user_id: user.id,
      paypal_subscription_id: subscriptionID,
      plan_id,
      product_id,
      status,
      last_credited_period: null
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  } else {
    // update status/plan if changed
    await admin.from('subscriptions').update({
      status,
      plan_id,
      product_id,
      updated_at: new Date().toISOString()
    }).eq('paypal_subscription_id', subscriptionID);
  }

  // Credit 250 only if not credited for this current period
  const { data: subRow } = await admin
    .from('subscriptions')
    .select('user_id, last_credited_period')
    .eq('paypal_subscription_id', subscriptionID)
    .single();

  if (!subRow) return NextResponse.json({ error: 'Subscription row missing' }, { status: 500 });

  if (subRow.last_credited_period !== nowPeriod) {
    // ensure wallet
    await admin.rpc('ensure_wallet', { p_user_id: user.id });

    // increment balance
    const { data: wallet } = await admin
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    const cur = wallet?.balance ?? 0;

    const { error: upErr } = await admin
      .from('user_wallets')
      .update({ balance: cur + 250, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { error: ledErr } = await admin
      .from('credit_ledger')
      .insert({
        user_id: user.id,
        delta: 250,
        reason: 'pro_monthly',
        payment_id: subscriptionID // we can key on sub id for idempotency this period
      });
    if (ledErr) return NextResponse.json({ error: ledErr.message }, { status: 500 });

    // mark credited for this month
    await admin
      .from('subscriptions')
      .update({ last_credited_period: nowPeriod, updated_at: new Date().toISOString() })
      .eq('paypal_subscription_id', subscriptionID);
  }

  return NextResponse.json({ ok: true, status });
}
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { paypalAccessToken } from '@/lib/paypal';

function periodKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

export async function POST(req: Request) {
  const admin = getAdminClient();
  const bodyText = await req.text();      // important: raw body for signature verification
  const headers = Object.fromEntries(req.headers.entries());
  const webhookId = process.env.PAYPAL_WEBHOOK_ID!;
  const { token, base } = await paypalAccessToken();

  // Verify webhook signature
  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(bodyText)
    })
  });
  const verify = await verifyRes.json();
  if (!verifyRes.ok || verify.verification_status !== 'SUCCESS') {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(bodyText);
  const eventType = event.event_type as string;
  const resource = event.resource || {};

  // Helpers
  async function creditIfNewPeriod(paypal_subscription_id: string) {
    const nowPeriod = periodKey();

    // Find subscription row + user
    const { data: sub } = await admin
      .from('subscriptions')
      .select('user_id, last_credited_period')
      .eq('paypal_subscription_id', paypal_subscription_id)
      .maybeSingle();

    if (!sub?.user_id) return;

    if (sub.last_credited_period !== nowPeriod) {
      await admin.rpc('ensure_wallet', { p_user_id: sub.user_id });

      const { data: wallet } = await admin
        .from('user_wallets')
        .select('balance')
        .eq('user_id', sub.user_id)
        .single();

      const cur = wallet?.balance ?? 0;

      await admin.from('user_wallets')
        .update({ balance: cur + 250, updated_at: new Date().toISOString() })
        .eq('user_id', sub.user_id);

      await admin.from('credit_ledger').insert({
        user_id: sub.user_id,
        delta: 250,
        reason: 'pro_monthly',
        payment_id: String(event.id)  // key on webhook event id to avoid dupes
      });

      await admin.from('subscriptions')
        .update({ last_credited_period: nowPeriod, updated_at: new Date().toISOString() })
        .eq('paypal_subscription_id', paypal_subscription_id);
    }
  }

  // Route by event type (covering common names)
  if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    const subId = String(resource.id || resource.subscription_id || '');
    if (!subId) return NextResponse.json({ ok: true });
    // mark active
    await admin.from('subscriptions')
      .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('paypal_subscription_id', subId);
    await creditIfNewPeriod(subId);
    return NextResponse.json({ ok: true });
  }

  if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED' || eventType === 'PAYMENT.SALE.COMPLETED') {
    // different payloads; try both places
    const subId =
      String(resource.billing_agreement_id || resource.id || resource.subscription_id || '');
    if (subId) await creditIfNewPeriod(subId);
    return NextResponse.json({ ok: true });
  }

  if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.SUSPENDED') {
    const subId = String(resource.id || resource.subscription_id || '');
    if (subId) {
      await admin.from('subscriptions')
        .update({ status: eventType.includes('CANCELLED') ? 'CANCELLED' : 'SUSPENDED', updated_at: new Date().toISOString() })
        .eq('paypal_subscription_id', subId);
    }
    return NextResponse.json({ ok: true });
  }

  // default: ignore others
  return NextResponse.json({ ok: true });
}
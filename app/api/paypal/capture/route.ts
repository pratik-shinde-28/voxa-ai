import { NextResponse } from 'next/server';
import { getPayPalAccessToken, PAYPAL_BASE } from '@/lib/paypal/api';
import { getAdminClient } from '@/lib/supabase/admin';

const PACKS: Record<string, { credits: number }> = {
  pack5:  { credits: 5  },
  pack10: { credits: 10 },
  pack30: { credits: 30 },
};

export async function POST(req: Request) {
  try {
    const { orderID, pack, user_id } = await req.json();
    if (!orderID || !PACKS[pack] || !user_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const access = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json' },
    });
    const j = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: j || 'Capture error' }, { status: 500 });
    }
    if (j.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // extra safety: confirm our pack matches
    const pu = (j.purchase_units && j.purchase_units[0]) || {};
    if (pu.custom_id !== pack) {
      return NextResponse.json({ error: 'Pack mismatch' }, { status: 400 });
    }

    // Credit the user
    const credits = PACKS[pack].credits;
    const admin = getAdminClient();

    // upsert wallet
    const { data: walletRow } = await admin
      .from('user_wallets')
      .upsert({ user_id, balance: 0 }, { onConflict: 'user_id' })
      .select('*')
      .single();

    const newBalance = (walletRow?.balance || 0) + credits;

    const { error: upErr } = await admin
      .from('user_wallets')
      .update({ balance: newBalance })
      .eq('user_id', user_id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    await admin.from('credit_ledger').insert({
      user_id,
      delta: credits,
      reason: `pack_${pack}`,
      payment_id: j?.id || orderID,
    });

    return NextResponse.json({ ok: true, credits });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getPayPalAccessToken, PAYPAL_BASE } from '@/lib/paypal/api';
import { createServer } from '@/lib/supabase/server';

const PACKS: Record<string, { amount: string; credits: number }> = {
  pack5:  { amount: '5.00',  credits: 5  },
  pack10: { amount: '10.00', credits: 10 },
  pack30: { amount: '25.00', credits: 30 },
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pack = url.searchParams.get('pack') || '';
    const sel = PACKS[pack];
    if (!sel) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });

    // Must be signed in to buy credits
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // send them to sign in first
      return NextResponse.redirect(new URL('/signin', url.origin), 302);
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
    const returnUrl = `${site}/paypal/return?pack=${encodeURIComponent(pack)}&u=${encodeURIComponent(user.id)}`;
    const cancelUrl = `${site}/credits?cancel=1`;

    const access = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: 'Voxa AI',
          user_action: 'PAY_NOW'
        },
        purchase_units: [
          { amount: { currency_code: 'USD', value: sel.amount }, custom_id: pack }
        ]
      })
    });
    const j = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: j || 'Create order error' }, { status: 500 });
    }

    const approve = (j?.links || []).find((l: any) => l.rel === 'approve')?.href;
    if (!approve) return NextResponse.json({ error: 'No approval link' }, { status: 500 });

    return NextResponse.redirect(approve, 302);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
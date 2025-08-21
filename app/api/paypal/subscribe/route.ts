import { NextResponse } from 'next/server';
import { getPayPalAccessToken, PAYPAL_BASE } from '@/lib/paypal/api';
import { createServer } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const planId = (process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || '').trim();
    if (!planId) return NextResponse.json({ error: 'Plan ID missing' }, { status: 500 });

    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/signin', url.origin), 302);

    const site = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
    const returnUrl = `${site}/paypal/subscribed?u=${encodeURIComponent(user.id)}`;
    const cancelUrl = `${site}/subscribe?cancel=1`;

    const access = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + access, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        application_context: {
          brand_name: 'Voxa AI',
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      })
    });
    const j = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: j || 'Create subscription error' }, { status: 500 });
    }

    const approve = (j?.links || []).find((l: any) => l.rel === 'approve')?.href;
    if (!approve) return NextResponse.json({ error: 'No approval link' }, { status: 500 });

    return NextResponse.redirect(approve, 302);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
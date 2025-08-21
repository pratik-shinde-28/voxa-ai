import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { paypalAccessToken } from '@/lib/paypal';

const PACKS: Record<string, { amount: string; credits: number }> = {
  pack5:  { amount: '5.00',  credits: 5 },
  pack10: { amount: '10.00', credits: 10 },
  pack30: { amount: '25.00', credits: 30 }, // volume break
};

export async function POST(req: Request) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { pack } = await req.json().catch(() => ({}));
  const sel = PACKS[pack as string];
  if (!sel) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });

  const { token, base } = await paypalAccessToken();

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: sel.amount },
        custom_id: `${pack}:${user.id}`, // ties order to the user securely
      }],
    }),
  });

  const j = await res.json();
  if (!res.ok) return NextResponse.json(j, { status: res.status });
  return NextResponse.json(j); // returns { id, links, ... }
}
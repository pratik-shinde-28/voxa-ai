import { NextResponse } from 'next/server';

const BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function appToken() {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const sec = process.env.PAYPAL_SECRET!;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(id + ':' + sec).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Token err ${res.status}: ${t}`);
  }
  const j = await res.json();
  return j.access_token as string;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const planId = url.searchParams.get('plan_id') || process.env.PAYPAL_PLAN_ID!;
    const tok = await appToken();
    const r = await fetch(`${BASE}/v1/billing/plans/${planId}`, {
      headers: { Authorization: `Bearer ${tok}` },
      cache: 'no-store',
    });
    const j = await r.json();
    return NextResponse.json({ ok: r.ok, status: r.status, plan: j });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
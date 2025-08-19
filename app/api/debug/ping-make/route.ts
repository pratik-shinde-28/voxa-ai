import { NextResponse } from 'next/server';

function trunc(s: string) {
  return s && s.length > 500 ? s.slice(0, 500) + '…' : s;
}

export async function GET() {
  const url = process.env.MAKE_WEBHOOK_URL || '';
  const secret = process.env.MAKE_WEBHOOK_SECRET || '';

  if (!url) {
    return NextResponse.json({ ok: false, reason: 'MAKE_WEBHOOK_URL missing' }, { status: 500 });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-voxa-secret': secret },
      body: JSON.stringify({ ping: 'from vercel', ts: Date.now() }),
    });
    const body = await res.text();
    return NextResponse.json({ ok: res.ok, status: res.status, body: trunc(body) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

export async function GET() {
  const cid = (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '').trim();
  const pid = (process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || '').trim();
  return NextResponse.json({
    has_client_id: !!cid,
    client_id_prefix: cid ? cid.slice(0, 10) : null,
    has_plan_id: !!pid,
    plan_id_prefix: pid ? pid.slice(0, 6) : null,
    mode: process.env.PAYPAL_MODE || 'unset',
  });
}
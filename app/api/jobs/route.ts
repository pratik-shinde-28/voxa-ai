import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const keyword = (body?.keyword || '').toString().trim();
    const target_wc = Number(body?.target_wc || 2500);

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    if (!Number.isFinite(target_wc) || target_wc < 500 || target_wc > 6000) {
      return NextResponse.json({ error: 'target_wc must be between 500 and 6000' }, { status: 400 });
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        keyword,
        target_wc,
        status: 'queued'
      })
      .select('*')
      .single();

    if (error || !job) {
      return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 });
    }

    // 🔔 Ping Make webhook (fire-and-forget)
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    const webhookSecret = process.env.MAKE_WEBHOOK_SECRET || '';
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-voxa-secret': webhookSecret
        },
        body: JSON.stringify({
          job_id: job.id,
          user_id: user.id,
          keyword,
          target_wc
        })
      }).catch(() => {});
    }

    return NextResponse.json({ job_id: job.id, status: job.status }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
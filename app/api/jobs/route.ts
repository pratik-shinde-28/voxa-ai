import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';

type PostBody = {
  keyword?: string;
  target_wc?: number;
};

export async function POST(req: Request) {
  try {
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as PostBody | null;
    const keyword = (body?.keyword || '').toString().trim();
    const target_wc = Number(body?.target_wc ?? 2500);

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    if (!Number.isFinite(target_wc) || target_wc < 500 || target_wc > 6000) {
      return NextResponse.json(
        { error: 'target_wc must be between 500 and 6000' },
        { status: 400 }
      );
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        keyword,
        target_wc,
        status: 'queued',
      })
      .select('*')
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: error?.message || 'Insert failed' },
        { status: 500 }
      );
    }

    // 🔔 Ping Make webhook and WAIT for acceptance (prevents dropped calls on serverless)
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    const webhookSecret = process.env.MAKE_WEBHOOK_SECRET || '';

    if (webhookUrl) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000); // 4s safety timeout

        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-voxa-secret': webhookSecret,
          },
          body: JSON.stringify({
            job_id: job.id,
            user_id: user.id,
            keyword,
            target_wc,
          }),
          signal: ctrl.signal,
        });

        clearTimeout(timer);

        if (!resp.ok) {
          // Log on server for visibility; still return 201 so UI is responsive
          console.warn('Make webhook non-2xx', resp.status);
        }
      } catch (err) {
        console.error('Make webhook fetch failed:', (err as Error)?.message);
        // You could also set this job to 'failed' here if you prefer strict behavior.
      }
    }

    return NextResponse.json(
      { job_id: job.id, status: job.status },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
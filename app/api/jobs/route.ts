import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

type PostBody = {
  keyword?: string;
  target_wc?: number;
  additional_details?: string | null;
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

    const rawNotes = (body?.additional_details ?? '')?.toString?.() ?? '';
    const additional_details = rawNotes ? rawNotes.slice(0, 4000) : null;

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    if (!Number.isFinite(target_wc) || target_wc < 500 || target_wc > 6000) {
      return NextResponse.json(
        { error: 'target_wc must be between 500 and 6000' },
        { status: 400 }
      );
    }

    // ---- Credit / Free usage enforcement (admin client) ----
    const admin = getAdminClient();

    // Ensure wallet row exists
    await admin.rpc('ensure_wallet', { p_user_id: user.id });

    // Fetch current balance
    const { data: wallet } = await admin
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    const balance = wallet?.balance ?? 0;

    // Count this month's used free jobs (queued/running/drafted)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const freeCountRes = await admin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['queued', 'running', 'drafted'])
      .gte('created_at', monthStart.toISOString());

    const freeUsed = freeCountRes.count ?? 0;

    const willDebit = balance > 0;

    if (!willDebit && freeUsed >= 3) {
      return NextResponse.json(
        { error: 'No credits left. Free tier is 3 articles per month. Buy a pack or subscribe.' },
        { status: 402 }
      );
    }

    // ---- Create job row ----
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        keyword,
        target_wc,
        additional_details,
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

    // ---- If paid balance, debit 1 credit now (idempotent via RPC) ----
    if (willDebit) {
      const { data: ok, error: debitErr } = await admin
        .rpc('debit_credit', { p_user_id: user.id, p_job_id: job.id });

      if (debitErr || ok !== true) {
        return NextResponse.json(
          { error: 'Debit failed. Please add credits and try again.' },
          { status: 402 }
        );
      }
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
            additional_details,
          }),
          signal: ctrl.signal,
        });

        clearTimeout(timer);

        if (!resp.ok) {
          console.warn('Make webhook non-2xx', resp.status);
        }
      } catch (err) {
        console.error('Make webhook fetch failed:', (err as Error)?.message);
        // Optional: mark job failed here and refund if you want stricter behavior.
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
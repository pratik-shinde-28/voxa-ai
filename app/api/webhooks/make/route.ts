import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

const SECRET = process.env.MAKE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  // 1) Verify shared secret (cheap)
  const headerSecret = req.headers.get('x-voxa-secret') || '';
  if (headerSecret !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Parse body
  const body = await req.json().catch(() => ({}));
  const { job_id, status, slug, wp_post_id, wp_url, error } = body;

  if (!job_id || !status) {
    return NextResponse.json({ error: 'job_id and status are required' }, { status: 400 });
  }

  // 3) Admin client
  let adminClient;
  try {
    adminClient = getAdminClient();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server misconfigured' }, { status: 500 });
  }

  // 4) Failed branch → refund if previously debited (idempotent RPC), then update job
  if (status === 'failed') {
    // Find user_id for this job
    const { data: jobRow } = await adminClient
      .from('jobs')
      .select('user_id')
      .eq('id', job_id)
      .single();

    if (jobRow?.user_id) {
      await adminClient.rpc('refund_credit', { p_user_id: jobRow.user_id, p_job_id: job_id });
    }

    const { error: upErr } = await adminClient
      .from('jobs')
      .update({
        status: 'failed',
        error: String(error || 'failed'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job_id);

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // 5) Default update path (running/drafted/etc.)
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (slug) updates.slug = String(slug);
  if (wp_post_id) updates.wp_post_id = String(wp_post_id);
  if (wp_url) updates.wp_url = String(wp_url);
  if (error) updates.error = String(error);

  const { error: upErr } = await adminClient
    .from('jobs')
    .update(updates)
    .eq('id', job_id);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
const SECRET = process.env.MAKE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
  if ((req.headers.get('x-voxa-secret') || '') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { job_id, status, slug, wp_post_id, wp_url, error } = await req.json();
  if (!job_id || !status) {
    return NextResponse.json({ error: 'job_id and status are required' }, { status: 400 });
  }
  const updates: any = { status, updated_at: new Date().toISOString() };
  if (slug) updates.slug = String(slug);
  if (wp_post_id) updates.wp_post_id = String(wp_post_id);
  if (wp_url) updates.wp_url = String(wp_url);
  if (error) updates.error = String(error);

  const { error: upErr } = await adminClient.from('jobs').update(updates).eq('id', job_id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
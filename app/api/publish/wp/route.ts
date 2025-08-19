import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { decrypt } from '@/lib/crypto/wp';

export async function POST(req: Request) {
  const secret = req.headers.get('x-voxa-secret') || '';
  if (secret !== (process.env.MAKE_WEBHOOK_SECRET || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { job_id, seo_title, article_html, slug } = await req.json().catch(() => ({}));
  if (!job_id || !seo_title || !article_html) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = await createServer();
  // find job + user
  const { data: job } = await supabase.from('jobs').select('id, user_id').eq('id', job_id).single();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  // fetch that user's WP config
  const { data: cfg } = await supabase
    .from('wp_configs')
    .select('base_url, username, app_password_enc')
    .eq('user_id', job.user_id)
    .maybeSingle();
  if (!cfg) return NextResponse.json({ error: 'WP config missing' }, { status: 400 });

  const password = decrypt(cfg.app_password_enc);

  // publish to that site's WP REST
  const url = `${cfg.base_url.replace(/\/+$/, '')}/wp-json/wp/v2/posts`;
  const auth = Buffer.from(`${cfg.username}:${password}`).toString('base64');

  const wpResp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: seo_title,
      content: article_html,
      status: 'draft',
      ...(slug ? { slug } : {})
    })
  });

  const wpText = await wpResp.text();
  if (!wpResp.ok) {
    await supabase.from('jobs').update({ status: 'failed', error: `WP ${wpResp.status}: ${wpText.slice(0,200)}` }).eq('id', job_id);
    return NextResponse.json({ error: 'WP publish failed', detail: wpText }, { status: 502 });
  }

  const wp = JSON.parse(wpText);
  const wp_post_id = wp.id;
  const wp_url = wp.link || `${cfg.base_url}?p=${wp_post_id}`;

  await supabase.from('jobs').update({ status: 'drafted', wp_post_id, wp_url, error: null }).eq('id', job_id);

  return NextResponse.json({ ok: true, wp_post_id, wp_url });
}
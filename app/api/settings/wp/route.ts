import { NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto/wp';

export async function GET() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data } = await supabase
    .from('wp_configs')
    .select('base_url, username, app_password_enc')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data) return NextResponse.json({ exists: false });

  // Do NOT return the raw password; return masked flag
  return NextResponse.json({
    exists: true,
    base_url: data.base_url,
    username: data.username,
    has_password: Boolean(data.app_password_enc),
  });
}

export async function POST(req: Request) {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null) as {
    base_url?: string; username?: string; app_password?: string;
  } | null;

  const base_url = (body?.base_url || '').trim();
  const username = (body?.username || '').trim();
  const app_password = (body?.app_password || '').trim();

  if (!/^https?:\/\//i.test(base_url)) {
    return NextResponse.json({ error: 'Base URL must start with http(s)://' }, { status: 400 });
  }
  if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });
  if (!app_password) return NextResponse.json({ error: 'Application password required' }, { status: 400 });

  const app_password_enc = encrypt(app_password);

  const { error } = await supabase
    .from('wp_configs')
    .upsert({
      user_id: user.id,
      base_url,
      username,
      app_password_enc,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
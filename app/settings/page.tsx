import { createServer } from '@/lib/supabase/server';

async function getConfig() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, config: null };
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/settings/wp`, { cache: 'no-store' });
  const config = res.ok ? await res.json() : null;
  return { user, config };
}

export default async function SettingsPage() {
  const { user, config } = await getConfig();
  if (!user) return <div className="p-6">Please sign in.</div>;

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="mt-6 rounded-2xl border p-6">
        <h2 className="text-lg font-medium">WordPress Connection</h2>
        <form
          className="mt-4 space-y-3"
          action="/api/settings/wp"
          method="POST"
        >
          <div>
            <label className="block text-sm font-medium">Base URL</label>
            <input name="base_url" defaultValue={config?.base_url || ''} className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="https://yourblog.com" />
          </div>
          <div>
            <label className="block text-sm font-medium">Username</label>
            <input name="username" defaultValue={config?.username || ''} className="mt-1 w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Application Password</label>
            <input name="app_password" type="password" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder={config?.has_password ? '••••••••' : ''} />
          </div>
          {/* Since Next.js default forms do a GET, we’ll handle via JS below */}
        </form>
        <ClientSaver />
      </section>
    </main>
  );
}

'use client';
import { useState } from 'react';

function ClientSaver() {
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: any) {
    e.preventDefault();
    const form = e.currentTarget.previousElementSibling as HTMLFormElement;
    const formData = new FormData(form);
    const body = {
      base_url: String(formData.get('base_url') || ''),
      username: String(formData.get('username') || ''),
      app_password: String(formData.get('app_password') || ''),
    };
    const res = await fetch('/api/settings/wp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setMsg(res.ok ? 'Saved!' : 'Save failed');
  }
  return (
    <div className="mt-4">
      <button onClick={onSubmit} className="rounded-xl border px-4 py-2 hover:bg-gray-50">Save</button>
      {msg && <span className="ml-3 text-sm">{msg}</span>}
    </div>
  );
}
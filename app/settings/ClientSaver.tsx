'use client';
import { useState } from 'react';

type Props = {
  initialConfig: { base_url: string; username: string; has_password: boolean };
};

export default function ClientSaver({ initialConfig }: Props) {
  const [baseUrl, setBaseUrl] = useState(initialConfig.base_url);
  const [username, setUsername] = useState(initialConfig.username);
  const [appPassword, setAppPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch('/api/settings/wp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: baseUrl,
          username,
          app_password: appPassword, // empty means “do not change”
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || 'Save failed');
      }
      setAppPassword(''); // clear after save
      setMsg('Saved!');
    } catch (e: any) {
      setMsg(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-medium">Base URL</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder="https://yourblog.com"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Username</label>
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Application Password</label>
        <input
          type="password"
          className="mt-1 w-full rounded-xl border px-3 py-2"
          placeholder={initialConfig.has_password ? '••••••••' : ''}
          value={appPassword}
          onChange={(e) => setAppPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Paste a WordPress Application Password. Leave blank to keep existing.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}
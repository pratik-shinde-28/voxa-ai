'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function NewJobForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [target, setTarget] = useState(2500);
  const [notes, setNotes] = useState(''); // NEW: Additional Details
  const [error, setError] = useState<string | null>(null);

  const MAX_NOTES = 4000; // ~4k chars to protect token costs

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!keyword.trim()) {
      setError('Keyword is required');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          target_wc: target,
          additional_details: notes ? notes.slice(0, MAX_NOTES) : null, // NEW
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || 'Failed to create job');
      }
      // Reset fields
      setKeyword('');
      setTarget(2500);
      setNotes(''); // NEW
      // Refresh the dashboard list
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-2xl border p-6 space-y-4">
      <h2 className="text-lg font-medium">New Draft</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <input
          name="keyword"
          placeholder="Keyword (required)"
          className="col-span-2 rounded-xl border px-3 py-2"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          required
        />
        <input
          name="target_wc"
          type="number"
          min={500}
          max={6000}
          className="rounded-xl border px-3 py-2"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        />
      </div>

      {/* NEW: Additional Details (optional) */}
      <div>
        <label className="block text-sm font-medium">Additional details (optional)</label>
        <textarea
          name="additional_details"
          rows={6}
          placeholder="Paste research, product facts, quotes to paraphrase, internal notes…"
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional. Max ~{MAX_NOTES.toLocaleString()} characters. Voxa will weave this into the draft.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create job'}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <p className="text-xs text-gray-500">We’ll queue the draft and start writing.</p>
    </form>
  );
}
'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewJobForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [target, setTarget] = useState(2500);
  const [notes, setNotes] = useState(''); // optional details
  const [error, setError] = useState<string | null>(null);
  const [noCredits, setNoCredits] = useState(false); // NEW

  const MAX_NOTES = 4000;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNoCredits(false);
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
          additional_details: notes ? notes.slice(0, MAX_NOTES) : null,
        }),
      });

      if (!res.ok) {
        // Detect 402 to show the special banner
        if (res.status === 402) {
          setNoCredits(true);
          const j = await res.json().catch(() => ({} as any));
          setError(j?.error || 'No credits left.');
          return;
        }
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || 'Failed to create job');
      }

      // Reset fields on success
      setKeyword('');
      setTarget(2500);
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 rounded-2xl border p-6 space-y-4">
      <h2 className="text-lg font-medium">New Draft</h2>

      {/* 402 banner */}
      {noCredits && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">You’ve used your 3 free articles this month.</div>
          <div className="mt-1">
            Buy a credit pack or subscribe to continue.
          </div>
          <div className="mt-2 flex gap-2">
            <Link
              href="/credits"
              className="inline-block rounded-lg border px-3 py-1.5 hover:bg-white"
            >
              Buy credits
            </Link>
            <Link
              href="/subscribe"
              className="inline-block rounded-lg border px-3 py-1.5 hover:bg-white"
            >
              View plans
            </Link>
          </div>
        </div>
      )}

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
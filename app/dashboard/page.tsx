import { createServer } from '@/lib/supabase/server';
import Link from 'next/link';
import NewJobForm from './NewJobForm';
import AutoRefresh from './AutoRefresh';

type Job = {
  id: string;
  user_id: string;
  keyword: string;
  target_wc: number;
  status: 'queued' | 'running' | 'revising' | 'drafted' | 'failed';
  slug: string | null;
  wp_post_id: string | null;
  wp_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string | null;
};

function StatusBadge({ status }: { status: Job['status'] }) {
  const styles: Record<Job['status'], string> = {
    queued: 'bg-amber-50 text-amber-700 border-amber-200',
    running: 'bg-blue-50 text-blue-700 border-blue-200',
    revising: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    drafted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

async function getUserAndJobs() {
  const supabase = await createServer();
  const [{ data: { user } }, { data: jobs }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(10),
  ]);
  return { user, jobs: (jobs as Job[]) || [] };
}

export default async function Dashboard() {
  const { user, jobs } = await getUserAndJobs();
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">You are not signed in.</p>
          <Link href="/signin" className="underline">Go to Sign in</Link>
        </div>
      </div>
    );
  }

  const hasActiveJobs = jobs.some(j => j.status === 'queued' || j.status === 'running' || j.status === 'revising');

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Auto-refresh only while active jobs exist */}
      <AutoRefresh active={hasActiveJobs} />

      <h1 className="text-2xl font-semibold">Voxa AI Dashboard</h1>
      <p className="text-sm text-gray-600 mt-2">Signed in as {user.email}</p>

      <NewJobForm />

      <div className="mt-8 rounded-2xl border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">Recent Jobs</h2>
        </div>
        <ul className="divide-y">
          {jobs.map(j => (
            <li key={j.id} className="p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{j.keyword}</div>
                  <div className="mt-1 flex items-center gap-2 text-gray-600">
                    <StatusBadge status={j.status} />
                    {j.slug ? <span className="truncate">• {j.slug}</span> : null}
                    {j.wp_url ? (
                      <>
                        <span>•</span>
                        <a className="underline" href={j.wp_url} target="_blank" rel="noreferrer">View draft</a>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-gray-500">
                  {new Date(j.created_at).toLocaleString()}
                </div>
              </div>
              {j.error ? <div className="text-rose-600 mt-1">Error: {j.error}</div> : null}
            </li>
          ))}
          {jobs.length === 0 && <li className="p-4 text-sm text-gray-600">No jobs yet.</li>}
        </ul>
      </div>
    </main>
  );
}

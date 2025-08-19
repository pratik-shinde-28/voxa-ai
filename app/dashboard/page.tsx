import { createServer } from '@/lib/supabase/server';
import Link from 'next/link';
import NewJobForm from './NewJobForm';

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
  created_at: string; // ISO timestamp
  updated_at: string | null;
};

async function getUserAndJobs() {
  const supabase = await createServer(); // ⬅️ await
  const [{ data: { user } }, { data: jobs }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
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

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Voxa AI Dashboard</h1>
      <p className="text-sm text-gray-600 mt-2">Signed in as {user.email}</p>

      <NewJobForm />

      <div className="mt-8 rounded-2xl border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">Recent Jobs</h2>
        </div>
        <ul className="divide-y">
          {jobs.map((j) => (
            <li key={j.id} className="p-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{j.keyword}</div>
                  <div className="text-gray-600">
                    {j.status}
                    {j.slug ? ` • ${j.slug}` : ''}
                    {j.wp_url ? ' • ' : ''}
                    {j.wp_url ? (
                      <a className="underline" href={j.wp_url} target="_blank">
                        View draft
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="text-gray-500">
                  {new Date(j.created_at).toLocaleString()}
                </div>
              </div>
              {j.error ? <div className="text-red-600 mt-1">Error: {j.error}</div> : null}
            </li>
          ))}
          {jobs.length === 0 && (
            <li className="p-4 text-sm text-gray-600">No jobs yet.</li>
          )}
        </ul>
      </div>
    </main>
  );
}
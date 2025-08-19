import { createServer } from '@/lib/supabase/server';
import ClientSaver from './ClientSaver';

export default async function SettingsPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-4">Please sign in.</p>
      </main>
    );
  }

  const { data } = await supabase
    .from('wp_configs')
    .select('base_url, username, app_password_enc')
    .eq('user_id', user.id)
    .maybeSingle();

  const initialConfig = {
    base_url: data?.base_url ?? '',
    username: data?.username ?? '',
    has_password: Boolean(data?.app_password_enc),
  };

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="mt-6 rounded-2xl border p-6">
        <h2 className="text-lg font-medium">WordPress Connection</h2>
        <ClientSaver initialConfig={initialConfig} />
      </section>
    </main>
  );
}
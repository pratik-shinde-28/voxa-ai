'use client';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthChangeEvent } from '@supabase/supabase-js';

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();

  // After sign-in, go to /dashboard
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'SIGNED_IN') router.push('/dashboard');
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 bg-white">
        <h1 className="text-2xl font-semibold mb-4">Sign in to Voxa AI</h1>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  inputText: '#111111',
                  inputPlaceholder: '#6b7280',
                  inputBackground: '#ffffff',
                  inputBorder: '#d1d5db',
                  messageText: '#111111',
                },
                radii: {
                  inputBorderRadius: '0.75rem',
                  buttonBorderRadius: '0.75rem',
                },
              },
            },
          }}
          providers={[]}
          view="magic_link"
          showLinks={true}
          // ⬇️ IMPORTANT: send users back to /signin after they click the email link
          redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/signin` : undefined}
        />

        <p className="text-xs text-gray-500 mt-4">
          We will email you a magic link to sign in.
        </p>
      </div>
    </div>
  );
}
import Link from 'next/link';

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold">Voxa AI</h1>
      <p className="mt-2 text-gray-700">
        From keyword to WordPress draft in minutes. Agent in development.
      </p>
      <Link href="/signin" className="inline-block mt-6 rounded-xl border px-4 py-2">
        Sign in
      </Link>
    </main>
  );
}
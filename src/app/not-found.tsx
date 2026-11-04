import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 opacity-70">The page you requested does not exist.</p>
      <Link href="/" className="mt-4 inline-block text-[var(--color-primary)] underline">
        Back to home
      </Link>
    </main>
  );
}

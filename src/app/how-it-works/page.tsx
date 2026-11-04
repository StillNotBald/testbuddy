import type { Metadata } from 'next';
import Link from 'next/link';
import { HowItWorksView } from '@/guide/how-it-works-view';

export const metadata: Metadata = { title: 'How it works - TestBuddy' };

export default function HowItWorksPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl p-4 text-ink md:p-8">
      <Link href="/" className="text-sm text-ink-muted underline">Back to TestBuddy</Link>
      <h1 className="mt-2 mb-4 text-2xl font-semibold">How it works</h1>
      <HowItWorksView />
    </main>
  );
}

import type { Metadata } from 'next';
import { LogoMark } from '@/components/Logo';

export const metadata: Metadata = { title: 'Offline' };

/**
 * Served by the service worker when a page isn't cached and there's no network.
 * Plain links (not next/link) so they do a real navigation the SW can handle.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sand-100 px-6 text-center">
      <LogoMark size={64} />
      <h1 className="mt-6 text-3xl font-extrabold">You’re offline</h1>
      <p className="mt-3 max-w-sm text-charcoal-500">
        No signal right now. Your most recent search is saved — open the map to see those stays, or try again when
        you’re back online.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/explore" className="rounded-full bg-coral-500 px-6 py-3 font-bold text-white">
          Open saved results
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="rounded-full border border-charcoal-200 px-6 py-3 font-semibold">
          Try again
        </a>
      </div>
    </main>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

/** Centered card layout shared by the sign-in and sign-up pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center bg-sand-100 px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <Link href="/" aria-label="Airbnbs Around Me — home">
        <Logo />
      </Link>
      <div className="mt-8 w-full max-w-md rounded-[2rem] bg-white p-7 shadow-card sm:p-9">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="mt-1.5 text-charcoal-500">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-charcoal-400">
        Not affiliated with Airbnb, Inc. Listings sourced via public data.
      </p>
    </main>
  );
}

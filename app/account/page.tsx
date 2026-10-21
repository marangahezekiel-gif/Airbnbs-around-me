import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { RoleSwitcher } from '@/components/auth/RoleSwitcher';
import { requirePageUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Your account' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: { need?: string; next?: string } };

export default async function AccountPage({ searchParams }: Props) {
  const user = await requirePageUser(undefined, '/account');
  const needsHost = searchParams.need === 'host' && user.role !== 'host';
  // only same-site paths
  const next = searchParams.next?.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : undefined;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-extrabold">Your account</h1>

        {needsHost && (
          <p role="status" className="mt-6 rounded-2xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700">
            That area is for hosts. Switch to a host account to continue.
          </p>
        )}

        <dl className="mt-8 divide-y divide-charcoal-100 rounded-3xl border border-charcoal-100">
          <div className="flex justify-between gap-4 px-5 py-4">
            <dt className="text-charcoal-500">Name</dt>
            <dd className="font-semibold">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4 px-5 py-4">
            <dt className="text-charcoal-500">Email</dt>
            <dd className="truncate font-semibold">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4 px-5 py-4">
            <dt className="text-charcoal-500">Currently using as</dt>
            <dd className="font-semibold capitalize">{user.role}</dd>
          </div>
        </dl>

        <div className="mt-8">
          <RoleSwitcher role={user.role} next={next} />
        </div>

        <p className="mt-8 text-sm text-charcoal-500">
          {user.role === 'host' ? (
            <Link href="/host/dashboard" className="font-bold text-charcoal-900 underline">
              Go to your host dashboard
            </Link>
          ) : (
            <Link href="/trips" className="font-bold text-charcoal-900 underline">
              See your trips
            </Link>
          )}
        </p>
      </main>
      <Footer />
    </>
  );
}

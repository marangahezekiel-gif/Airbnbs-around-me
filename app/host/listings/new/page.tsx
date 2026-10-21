import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ListingForm } from '@/components/host/ListingForm';
import { requirePageUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Add a listing' };
export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  await requirePageUser('host', '/host/listings/new');
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <Link href="/host/dashboard" className="text-sm font-semibold text-charcoal-600 hover:text-charcoal-900">
          ← Back to dashboard
        </Link>
        <h1 className="mb-6 mt-3 text-3xl font-extrabold">Add a listing</h1>
        <ListingForm />
      </main>
    </>
  );
}

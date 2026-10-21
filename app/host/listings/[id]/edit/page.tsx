import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header';
import { ListingForm } from '@/components/host/ListingForm';
import { requirePageUser } from '@/lib/auth';
import { getListing } from '@/lib/marketplace/repo';

export const metadata: Metadata = { title: 'Edit listing' };
export const dynamic = 'force-dynamic';

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const user = await requirePageUser('host', `/host/listings/${params.id}/edit`);
  const listing = await getListing(params.id);
  // someone else's listing looks exactly like a missing one
  if (!listing || listing.hostId !== user.id) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
        <Link href="/host/dashboard" className="text-sm font-semibold text-charcoal-600 hover:text-charcoal-900">
          ← Back to dashboard
        </Link>
        <h1 className="mb-6 mt-3 text-3xl font-extrabold">Edit listing</h1>
        <ListingForm listing={listing} />
      </main>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/host/StatusBadge';
import { CancelBookingButton } from '@/components/trips/CancelBookingButton';
import { requirePageUser } from '@/lib/auth';
import { googleMapsDirectionsUrl } from '@/lib/directions';
import { formatPrice, formatStay } from '@/lib/format';
import { todayIso } from '@/lib/marketplace/availability';
import { getListingsByIds, listBookingsByGuest } from '@/lib/marketplace/repo';

export const metadata: Metadata = { title: 'My trips' };
export const dynamic = 'force-dynamic';

/**
 * A guest's bookings. Signed-in users only (middleware + requirePageUser).
 * Confirmed stays also get the address and a "Get directions" shortcut.
 */
export default async function TripsPage() {
  const user = await requirePageUser(undefined, '/trips');
  const bookings = await listBookingsByGuest(user.id);
  const listings = await getListingsByIds(bookings.map((b) => b.listingId));
  const byId = new Map(listings.map((l) => [l.id, l]));
  const today = todayIso();

  const upcoming = bookings.filter((b) => (b.status === 'pending' || b.status === 'accepted') && b.checkOut >= today);
  const past = bookings.filter((b) => !upcoming.includes(b));

  const card = (b: (typeof bookings)[number], active: boolean) => {
    const l = byId.get(b.listingId);
    return (
      <li key={b.id} className="flex flex-col gap-4 rounded-3xl border border-charcoal-100 bg-white p-4 shadow-card sm:flex-row">
        {l?.photos[0] ? (
          <img src={l.photos[0]} alt="" className="aspect-[4/3] w-full rounded-2xl bg-charcoal-100 object-cover sm:w-44" />
        ) : (
          <div className="aspect-[4/3] w-full rounded-2xl bg-charcoal-100 sm:w-44" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-lg font-bold">{l?.title ?? 'This listing was removed'}</p>
              <StatusBadge status={b.status} />
            </div>
            <p className="mt-1 text-charcoal-600">
              {formatStay(b.checkIn, b.checkOut)} · {b.nights} night{b.nights > 1 ? 's' : ''} · {b.guests} guest{b.guests > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-charcoal-500">Total {formatPrice(b.totalPrice, b.currency)} · pay the host directly</p>
            {b.status === 'accepted' && l && <p className="mt-1 truncate text-sm text-charcoal-500">{l.address}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {l && (
              <Link href={`/listing/${l.id}`} className="rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-charcoal-900">
                View listing
              </Link>
            )}
            {l && b.status === 'accepted' && (
              <a
                href={googleMapsDirectionsUrl({ lat: l.lat, lng: l.lng })}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-charcoal-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-charcoal-700"
              >
                Get directions
              </a>
            )}
            {active && <CancelBookingButton bookingId={b.id} accepted={b.status === 'accepted'} />}
          </div>
        </div>
      </li>
    );
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-widest text-coral-500">My trips</p>
        <h1 className="mt-1 text-3xl font-extrabold">Your stays</h1>

        {bookings.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-charcoal-200 p-8 text-center">
            <p className="font-bold">No trips yet.</p>
            <p className="mt-1 text-charcoal-500">Find a place near you and send your first request.</p>
            <Link href="/explore?locate=1" className="mt-5 inline-block rounded-full bg-coral-500 px-6 py-3 font-bold text-white hover:bg-coral-600">
              Find stays near me
            </Link>
          </div>
        )}

        {upcoming.length > 0 && (
          <section aria-labelledby="upcoming" className="mt-10">
            <h2 id="upcoming" className="text-xl font-bold">
              Upcoming
            </h2>
            <ul className="mt-4 space-y-3">{upcoming.map((b) => card(b, true))}</ul>
          </section>
        )}

        {past.length > 0 && (
          <section aria-labelledby="past" className="mt-10">
            <h2 id="past" className="text-xl font-bold">
              Past and closed
            </h2>
            <ul className="mt-4 space-y-3">{past.map((b) => card(b, false))}</ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

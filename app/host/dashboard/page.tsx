import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { BookingActions } from '@/components/host/BookingActions';
import { DeleteListingButton } from '@/components/host/DeleteListingButton';
import { StatusBadge } from '@/components/host/StatusBadge';
import { requirePageUser } from '@/lib/auth';
import { formatPrice, formatStay } from '@/lib/format';
import { todayIso } from '@/lib/marketplace/availability';
import { listBookingsForListings, listListingsByHost } from '@/lib/marketplace/repo';

export const metadata: Metadata = { title: 'Host dashboard' };
export const dynamic = 'force-dynamic';

export default async function HostDashboard() {
  const user = await requirePageUser('host', '/host/dashboard');
  const listings = await listListingsByHost(user.id);
  const bookings = listings.length ? await listBookingsForListings(listings.map((l) => l.id)) : [];
  const byId = new Map(listings.map((l) => [l.id, l]));
  const today = todayIso();

  const pending = bookings.filter((b) => b.status === 'pending' && b.checkOut > today);
  const upcoming = bookings
    .filter((b) => b.status === 'accepted' && b.checkOut > today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const history = bookings.filter((b) => !pending.includes(b) && !upcoming.includes(b)).slice(0, 15);

  // revenue per currency (a host could price listings in different currencies)
  const revenue = new Map<string, number>();
  for (const b of upcoming) revenue.set(b.currency, (revenue.get(b.currency) ?? 0) + b.totalPrice);
  const revenueText = revenue.size ? [...revenue].map(([c, n]) => formatPrice(n, c)).join(' · ') : '—';

  const stats = [
    { label: 'Listings', value: String(listings.length) },
    { label: 'Pending requests', value: String(pending.length), highlight: pending.length > 0 },
    { label: 'Upcoming stays', value: String(upcoming.length) },
    { label: 'Upcoming revenue', value: revenueText },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Host dashboard</p>
            <h1 className="mt-1 text-3xl font-extrabold">Hi {user.name.split(' ')[0]} 👋</h1>
          </div>
          <Link href="/host/listings/new" className="rounded-full bg-coral-500 px-6 py-3 font-bold text-white transition hover:bg-coral-600 active:scale-95">
            + Add a listing
          </Link>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-3xl border p-5 ${s.highlight ? 'border-coral-300 bg-coral-50' : 'border-charcoal-100 bg-white'}`}>
              <dt className="text-sm text-charcoal-500">{s.label}</dt>
              <dd className="mt-1 text-2xl font-extrabold">{s.value}</dd>
            </div>
          ))}
        </dl>

        {/* ── booking requests ── */}
        <section aria-labelledby="requests" className="mt-12">
          <h2 id="requests" className="text-xl font-bold">
            Booking requests
          </h2>
          {pending.length === 0 ? (
            <p className="mt-3 rounded-3xl border border-dashed border-charcoal-200 p-6 text-charcoal-500">No requests waiting. New ones will show up here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pending.map((b) => (
                <li key={b.id} className="flex flex-col gap-4 rounded-3xl border border-charcoal-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold">{byId.get(b.listingId)?.title ?? 'Listing'}</p>
                    <p className="mt-0.5 text-charcoal-600">
                      {b.guestName} · {formatStay(b.checkIn, b.checkOut)} · {b.guests} guest{b.guests > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-charcoal-500">
                      {b.nights} night{b.nights > 1 ? 's' : ''} · {formatPrice(b.totalPrice, b.currency)} · {b.guestEmail}
                    </p>
                    {b.note && <p className="mt-2 rounded-2xl bg-charcoal-50 px-3 py-2 text-sm text-charcoal-600">“{b.note}”</p>}
                  </div>
                  <BookingActions bookingId={b.id} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── upcoming stays ── */}
        {upcoming.length > 0 && (
          <section aria-labelledby="upcoming" className="mt-12">
            <h2 id="upcoming" className="text-xl font-bold">
              Upcoming stays
            </h2>
            <ul className="mt-4 divide-y divide-charcoal-100 rounded-3xl border border-charcoal-100 bg-white">
              {upcoming.map((b) => {
                const l = byId.get(b.listingId);
                const unit = l?.units.find((u) => u.id === b.unitId)?.label;
                return (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                    <div>
                      <p className="font-semibold">
                        {l?.title ?? 'Listing'}
                        {unit ? ` · ${unit}` : ''}
                      </p>
                      <p className="text-sm text-charcoal-500">
                        {b.guestName} · {formatStay(b.checkIn, b.checkOut)} · {b.guests} guest{b.guests > 1 ? 's' : ''}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ── listings ── */}
        <section aria-labelledby="listings" className="mt-12">
          <h2 id="listings" className="text-xl font-bold">
            Your listings
          </h2>
          {listings.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-charcoal-200 p-8 text-center">
              <p className="font-bold">You haven’t listed a place yet.</p>
              <p className="mt-1 text-charcoal-500">It takes about five minutes. Guests nearby will see it on the map straight away.</p>
              <Link href="/host/listings/new" className="mt-5 inline-block rounded-full bg-coral-500 px-6 py-3 font-bold text-white hover:bg-coral-600">
                Create your first listing
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {listings.map((l) => (
                <li key={l.id} className="flex flex-col gap-4 rounded-3xl border border-charcoal-100 bg-white p-4 shadow-card sm:flex-row">
                  <img src={l.photos[0]} alt="" className="aspect-[4/3] w-full rounded-2xl bg-charcoal-100 object-cover sm:w-48" />
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div>
                      <p className="truncate text-lg font-bold">{l.title}</p>
                      <p className="text-charcoal-500">
                        {formatPrice(l.pricePerNight, l.currency)} night · {l.units.length} unit{l.units.length > 1 ? 's' : ''} · {l.instantBook ? 'Instant Book' : 'Request to book'}
                      </p>
                      <p className="truncate text-sm text-charcoal-400">{l.address}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/listing/${l.id}`} className="rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-charcoal-900">
                        View
                      </Link>
                      <Link href={`/host/listings/${l.id}/edit`} className="rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-charcoal-900">
                        Edit
                      </Link>
                      <DeleteListingButton listingId={l.id} title={l.title} bookingCount={bookings.filter((b) => b.listingId === l.id).length} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {history.length > 0 && (
          <section aria-labelledby="history" className="mt-12">
            <h2 id="history" className="text-xl font-bold">
              Past and closed requests
            </h2>
            <ul className="mt-4 divide-y divide-charcoal-100 rounded-3xl border border-charcoal-100 bg-white">
              {history.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
                  <span>
                    <b>{byId.get(b.listingId)?.title ?? 'Listing'}</b> · {b.guestName} · {formatStay(b.checkIn, b.checkOut)}
                  </span>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

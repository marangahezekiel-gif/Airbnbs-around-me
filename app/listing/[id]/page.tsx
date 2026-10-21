import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { AvailabilityCalendar } from '@/components/listing/AvailabilityCalendar';
import { Gallery } from '@/components/listing/Gallery';
import { BookingPanel } from '@/components/listing/BookingPanel';
import { LocationMap } from '@/components/listing/LocationMap';
import { PriceAlertButton } from '@/components/listing/PriceAlertButton';
import { googleMapsDirectionsUrl } from '@/lib/directions';
import { formatPrice, formatRating, formatReviewDate, initials, propertyTypeLabel } from '@/lib/format';
import { getListingById } from '@/lib/listings';
import { getListing, occupiedByListing } from '@/lib/marketplace/repo';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await getListingById(decodeURIComponent(params.id));
  if (!l) return { title: 'Listing not found' };
  return {
    title: l.title,
    description: `${propertyTypeLabel(l.propertyType)} in ${l.neighborhood} from ${formatPrice(l.pricePerNight, l.currency)} a night.`,
  };
}

export default async function ListingPage({ params }: Props) {
  const l = await getListingById(decodeURIComponent(params.id));
  if (!l) notFound();

  const price = formatPrice(l.pricePerNight, l.currency);
  const affiliateUrl = l.affiliateUrl ?? l.airbnbUrl;

  // Host-created listings are booked on this site; everything else sends people to Airbnb.
  const hosted = l.source === 'host';
  const record = hosted ? await getListing(l.id) : null;
  const occupied = record ? ((await occupiedByListing([l.id])).get(l.id) ?? []) : [];
  const directionsUrl = googleMapsDirectionsUrl({ lat: l.lat, lng: l.lng });
  const backHref = `/explore?lat=${l.lat.toFixed(4)}&lng=${l.lng.toFixed(4)}&name=${encodeURIComponent(l.neighborhood || 'This area')}`;

  const facts = [
    `${l.maxGuests} guests`,
    l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} bedroom${l.bedrooms > 1 ? 's' : ''}`,
    `${l.beds} bed${l.beds > 1 ? 's' : ''}`,
    `${l.bathrooms} bath${l.bathrooms > 1 ? 's' : ''}`,
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-charcoal-600 hover:text-charcoal-900">
          ← Back to the map
        </Link>

        <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">{l.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-charcoal-600">
          {l.reviewCount > 0 ? (
            <>
              <span className="font-semibold text-charcoal-900">
                <span aria-hidden="true" className="text-coral-500">★</span> {formatRating(l.rating)}
              </span>
              <span>· {l.reviewCount} reviews</span>
            </>
          ) : (
            <span className="rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-bold text-coral-700">New</span>
          )}
          {l.neighborhood && <span>· {l.neighborhood}</span>}
          {l.host.isSuperhost && <span className="rounded-full bg-charcoal-900 px-2.5 py-0.5 text-xs font-semibold text-white">Superhost</span>}
        </p>

        <div className="mt-5">
          <Gallery photos={l.photos} title={l.title} />
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_22rem]">
          {/* ── left column ── */}
          <div className="min-w-0 space-y-12">
            <section aria-labelledby="host" className="flex items-center justify-between gap-4 border-b border-charcoal-100 pb-8">
              <div>
                <h2 id="host" className="text-xl font-bold">
                  {propertyTypeLabel(l.propertyType)} hosted by {l.host.name}
                </h2>
                <p className="mt-1 text-charcoal-500">{facts.join(' · ')}</p>
                <p className="mt-1 text-sm text-charcoal-500">
                  {l.host.yearsHosting > 0 ? `${l.host.yearsHosting} year${l.host.yearsHosting > 1 ? 's' : ''} hosting` : 'New host'}
                  {l.instantBook ? ' · Instant Book' : ''}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral-100 text-lg font-extrabold text-coral-700"
              >
                {initials(l.host.name)}
              </span>
            </section>

            <section aria-labelledby="about">
              <h2 id="about" className="text-xl font-bold">About this place</h2>
              <p className="mt-3 leading-relaxed text-charcoal-600">{l.description}</p>
            </section>

            <section aria-labelledby="amenities">
              <h2 id="amenities" className="text-xl font-bold">What this place offers</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {l.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3 text-charcoal-700">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5A4D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    {a}
                  </li>
                ))}
              </ul>
            </section>

            {hosted && l.houseRules && (
              <section aria-labelledby="rules">
                <h2 id="rules" className="text-xl font-bold">House rules</h2>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-charcoal-600">{l.houseRules}</p>
              </section>
            )}

            {hosted && (
              <section aria-labelledby="where">
                <h2 id="where" className="text-xl font-bold">Where you’ll be</h2>
                <div className="mt-4">
                  <LocationMap lat={l.lat} lng={l.lng} title={l.title} address={l.address} />
                </div>
              </section>
            )}

            {hosted && record ? (
              <section id="book" aria-labelledby="availability" className="scroll-mt-24">
                <h2 id="availability" className="text-xl font-bold">Book your stay</h2>
                <div className="mt-4">
                  <BookingPanel
                    listingId={l.id}
                    hostId={record.hostId}
                    pricePerNight={l.pricePerNight}
                    currency={l.currency}
                    maxGuests={l.maxGuests}
                    instantBook={l.instantBook}
                    units={record.units}
                    occupied={occupied}
                    blockedDates={record.blockedDates}
                  />
                </div>
              </section>
            ) : (
              <section aria-labelledby="availability">
                <h2 id="availability" className="text-xl font-bold">Availability</h2>
                <div className="mt-4">
                  <AvailabilityCalendar listingId={l.id} airbnbUrl={affiliateUrl} blockedDates={l.blockedDates} />
                </div>
              </section>
            )}

            {l.reviews.length > 0 && (
              <section aria-labelledby="reviews">
                <h2 id="reviews" className="text-xl font-bold">
                  <span aria-hidden="true" className="text-coral-500">★</span> {formatRating(l.rating)} · {l.reviewCount} reviews
                </h2>
                <ul className="mt-5 grid gap-6 sm:grid-cols-2">
                  {l.reviews.map((r) => (
                    <li key={r.id} className="rounded-3xl border border-charcoal-100 p-5">
                      <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-100 text-sm font-bold">
                          {initials(r.author)}
                        </span>
                        <div>
                          <p className="font-semibold">{r.author}</p>
                          <p className="text-xs text-charcoal-500">{formatReviewDate(r.date)}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-charcoal-600">{r.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* ── sticky booking card (desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-charcoal-100 bg-white p-6 shadow-card">
              <p className="text-2xl">
                <b className="font-extrabold">{price}</b> <span className="text-base text-charcoal-500">night</span>
              </p>
              {hosted ? (
                <>
                  {l.unitsTotal != null && (
                    <p className="mt-2 text-sm text-charcoal-600">
                      {l.unitsLeft === 0
                        ? 'Fully booked tonight'
                        : `${l.unitsLeft} of ${l.unitsTotal} unit${l.unitsTotal > 1 ? 's' : ''} free tonight`}
                    </p>
                  )}
                  <a href="#book" className="mt-5 block rounded-full bg-coral-500 px-5 py-3.5 text-center font-bold text-white transition hover:bg-coral-600 active:scale-[.98]">
                    {l.instantBook ? 'Check dates & book' : 'Check dates & request'}
                  </a>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block rounded-full border border-charcoal-200 px-5 py-3 text-center font-bold transition hover:border-charcoal-900"
                  >
                    Get directions
                  </a>
                  <p className="mt-4 text-xs leading-relaxed text-charcoal-400">
                    Hosted directly on Airbnbs Around Me. You won’t be charged when you send a request.
                  </p>
                </>
              ) : (
                <>
                  <a
                    href={affiliateUrl}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className="mt-5 block rounded-full bg-coral-500 px-5 py-3.5 text-center font-bold text-white transition hover:bg-coral-600 active:scale-[.98]"
                  >
                    View on Airbnb
                  </a>
                  <PriceAlertButton listingId={l.id} price={l.pricePerNight} />
                  <p className="mt-4 text-xs leading-relaxed text-charcoal-400">
                    Opens Airbnb in a new tab. This is an affiliate link — we may earn a commission at no extra cost to you.
                    Final prices and availability are set by Airbnb.
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ── sticky booking bar (mobile) ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-charcoal-100 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-sheet lg:hidden">
        <p>
          <b className="text-lg font-extrabold">{price}</b> <span className="text-sm text-charcoal-500">night</span>
        </p>
        {hosted ? (
          <a href="#book" className="rounded-full bg-coral-500 px-6 py-3 text-sm font-bold text-white active:scale-95">
            {l.instantBook ? 'Book now' : 'Request to book'}
          </a>
        ) : (
          <a
            href={affiliateUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="rounded-full bg-coral-500 px-6 py-3 text-sm font-bold text-white active:scale-95"
          >
            View on Airbnb
          </a>
        )}
      </div>

      <Footer />
    </>
  );
}

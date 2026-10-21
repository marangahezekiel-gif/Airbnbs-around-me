'use client';

import Link from 'next/link';
import { formatPrice, formatRating, propertyTypeLabel } from '@/lib/format';
import type { Listing } from '@/lib/types';

interface Props {
  listing: Listing;
  distanceLabel: string;
  active: boolean;
  onActivate: (id: string) => void;
  onHover: (id: string | null) => void;
}

/**
 * One result card. Clicking it highlights the matching pin on the map;
 * the "View details" link opens the full listing page.
 */
export function ListingCard({ listing: l, distanceLabel, active, onActivate, onHover }: Props) {
  return (
    <article
      id={`card-${l.id}`}
      tabIndex={0}
      aria-label={`${l.title}, ${formatPrice(l.pricePerNight, l.currency)} per night`}
      onClick={() => onActivate(l.id)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onActivate(l.id);
        }
      }}
      onMouseEnter={() => onHover(l.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(l.id)}
      onBlur={() => onHover(null)}
      className={`group cursor-pointer rounded-3xl p-2 transition ${
        active ? 'bg-coral-50 ring-2 ring-coral-500' : 'hover:bg-charcoal-50'
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-sand-200 to-coral-100">
        <img
          src={l.photos[0]}
          alt=""
          loading="lazy"
          decoding="async"
          // Hide broken images (e.g. offline) and let the gradient show through
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {l.instantBook && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-charcoal-800 shadow-pin">
            Instant book
          </span>
        )}
        {l.host.isSuperhost && (
          <span className="absolute bottom-3 left-3 rounded-full bg-charcoal-900/85 px-2.5 py-1 text-xs font-semibold text-white">
            Superhost
          </span>
        )}
        {/* Host-created stays are bookable here: show how many units are free tonight */}
        {l.source === 'host' && l.unitsTotal != null && (
          <span
            className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-pin ${
              l.unitsLeft === 0 ? 'bg-charcoal-900 text-white' : 'bg-white/95 text-charcoal-800'
            }`}
          >
            {l.unitsLeft === 0 ? 'Full tonight' : `${l.unitsLeft} of ${l.unitsTotal} left`}
          </span>
        )}
      </div>

      <div className="px-1.5 pb-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-[15px] font-bold leading-snug">{l.title}</h3>
          {l.reviewCount > 0 ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
              <span aria-hidden="true" className="text-coral-500">★</span>
              {formatRating(l.rating)}
              <span className="font-normal text-charcoal-400">({l.reviewCount})</span>
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-bold text-coral-700">New</span>
          )}
        </div>

        <p className="mt-0.5 text-sm text-charcoal-500">
          {propertyTypeLabel(l.propertyType)} · {l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} bedroom${l.bedrooms > 1 ? 's' : ''}`}
          {l.neighborhood ? ` · ${l.neighborhood}` : ''}
        </p>
        <p className="text-sm text-charcoal-500">{distanceLabel}</p>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-[15px]">
            <span className="font-extrabold">{formatPrice(l.pricePerNight, l.currency)}</span>{' '}
            <span className="text-charcoal-500">night</span>
          </p>
          <Link
            href={`/listing/${encodeURIComponent(l.id)}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-full border border-charcoal-200 px-3 py-1.5 text-sm font-semibold transition hover:border-charcoal-900"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl p-2" aria-hidden="true">
      <div className="aspect-[4/3] rounded-2xl bg-charcoal-100" />
      <div className="space-y-2 px-1.5 pt-3">
        <div className="h-4 w-3/4 rounded bg-charcoal-100" />
        <div className="h-3 w-1/2 rounded bg-charcoal-100" />
        <div className="h-3 w-1/3 rounded bg-charcoal-100" />
      </div>
    </div>
  );
}

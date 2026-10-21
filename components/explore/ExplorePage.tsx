'use client';

/**
 * The map + list experience. This component owns all the state:
 *   location → search centre → /api/listings → list + pins, with
 *   card ⇄ pin highlighting kept in sync through `activeId`/`hoverId`.
 */
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserMenu } from '@/components/auth/UserMenu';
import { InstallButton } from '@/components/InstallPrompt';
import { Logo } from '@/components/Logo';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { activeFilterCount, buildListingsQuery, DEFAULT_FILTERS, type Filters } from '@/lib/filters';
import { formatDistance } from '@/lib/format';
import { searchPlaces } from '@/lib/geocode';
import { haversineKm } from '@/lib/geo';
import type { LatLng, Listing, Place } from '@/lib/types';
import { AroundMeButton } from './AroundMeButton';
import { FiltersModal } from './FiltersModal';
import { ListPanel, type Snap } from './ListPanel';
import type { MapFocus } from './MapView';
import { SearchBar } from './SearchBar';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-sand-200" aria-hidden="true" />,
});

const DEFAULT_CENTER: LatLng = {
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? 48.8566),
  lng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? 2.3522),
};
const DEFAULT_PLACE = process.env.NEXT_PUBLIC_DEFAULT_PLACE ?? 'Paris';

const CACHE_KEY = 'aam:last-search';

interface SavedSearch {
  center: LatLng;
  label: string;
  listings: Listing[];
}

const GEO_MESSAGES = {
  denied: 'Location access is off. Turn it on in your browser or phone settings to use “Around me now”, or search for a place.',
  unavailable: 'We couldn’t get your location. Check that GPS or network is on and try again, or search for a place.',
  unsupported: 'This browser can’t share your location. Search for a city or address instead.',
} as const;

export default function ExplorePage() {
  const params = useSearchParams();
  const { position: userPos, status: geoStatus, request: requestLocation } = useGeolocation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const [center, setCenter] = useState<LatLng | null>(null);
  const [label, setLabel] = useState('');
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snap>('half');
  const [notice, setNotice] = useState<string | null>(null);

  // Move the search centre AND the camera (search, "Around me now", first load)
  const goTo = useCallback((c: LatLng, newLabel: string) => {
    setCenter(c);
    setLabel(newLabel);
    setFocus({ ...c, key: Date.now() });
    setActiveId(null);
  }, []);

  // ── 1. Decide where to start (runs once) ────────────────────
  useEffect(() => {
    const lat = parseFloat(params.get('lat') ?? '');
    const lng = parseFloat(params.get('lng') ?? '');
    const q = params.get('q');
    const wantsLocate = params.get('locate') === '1';

    (async () => {
      if (!wantsLocate && Number.isFinite(lat) && Number.isFinite(lng)) {
        goTo({ lat, lng }, params.get('name') ?? 'Selected area');
        return;
      }
      // Ask for location on load (the user arrived by tapping a "near me" action)
      if (wantsLocate || !q) {
        const p = await requestLocation();
        if (p) return goTo(p, 'Around you');
      }
      if (q) {
        try {
          const [place] = await searchPlaces(q);
          if (place) return goTo({ lat: place.lat, lng: place.lng }, place.name.split(',')[0]);
        } catch {
          /* fall through to the default */
        }
      }
      goTo(DEFAULT_CENTER, DEFAULT_PLACE);
    })();
    // Only on first mount – later navigation is driven by user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explain why location isn't being used
  useEffect(() => {
    if (geoStatus === 'denied' || geoStatus === 'unavailable' || geoStatus === 'unsupported') {
      setNotice(GEO_MESSAGES[geoStatus]);
    } else if (geoStatus === 'granted') {
      setNotice(null);
    }
  }, [geoStatus]);

  // ── 2. Fetch listings whenever the centre or filters change ──
  useEffect(() => {
    if (!center) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/listings?${buildListingsQuery(center, filters)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { listings: Listing[] };
        setListings(data.listings);
        setOffline(false);
        saveSearch({ center, label, listings: data.listings });
      } catch {
        if (ctrl.signal.aborted) return;
        // Offline / server error → fall back to the last successful search
        const saved = loadSearch();
        if (saved) {
          setListings(saved.listings);
          setOffline(true);
        } else {
          setError('We couldn’t load stays right now. Check your connection and try again.');
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // `label` only decorates the saved copy; it must not trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, filters]);

  // ── handlers ────────────────────────────────────────────────
  const handleAroundMe = useCallback(async () => {
    const p = await requestLocation();
    if (p) {
      setNotice(null);
      goTo(p, 'Around you');
    }
  }, [requestLocation, goTo]);

  const handleSelectPlace = useCallback(
    (place: Place) => goTo({ lat: place.lat, lng: place.lng }, place.name.split(',')[0]),
    [goTo],
  );

  const handlePinSelect = useCallback((id: string | null) => {
    setActiveId(id);
    if (id) setSnap((s) => (s === 'collapsed' ? 'half' : s));
  }, []);

  // ── derived values ──────────────────────────────────────────
  // Show distance from the user when they're nearby; otherwise from the searched place.
  const distanceLabels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const l of listings) {
      const fromUser = userPos ? haversineKm(userPos, l) : null;
      if (fromUser != null && fromUser <= 200) out[l.id] = `${formatDistance(fromUser)} from you`;
      else if (center) out[l.id] = `${formatDistance(haversineKm(center, l))} from ${label || 'centre'}`;
    }
    return out;
  }, [listings, userPos, center, label]);

  const filterCount = activeFilterCount(filters);
  const locating = geoStatus === 'loading';
  // Keep map targets visible above the mobile bottom sheet (px of camera padding)
  const viewportH = typeof window === 'undefined' ? 800 : window.innerHeight;
  const bottomPad = isDesktop ? 0 : snap === 'collapsed' ? 100 : snap === 'half' ? Math.round(viewportH * 0.38) : 0;

  const title = `${listings.length} stay${listings.length === 1 ? '' : 's'}${label ? ` · ${label}` : ''}`;

  return (
    <div className="flex h-[100dvh] flex-col overscroll-none bg-white">
      {/* ── top bar ── */}
      <header className="z-30 flex items-center gap-3 border-b border-charcoal-100 bg-white px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-5">
        <Link href="/" aria-label="Airbnbs Around Me — home" className="shrink-0">
          <Logo wordmarkClassName="hidden xl:inline" />
        </Link>
        <SearchBar className="min-w-0 flex-1 lg:max-w-xl" onSelectPlace={handleSelectPlace} onUseLocation={handleAroundMe} />
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-full border border-charcoal-200 px-4 py-2.5 text-sm font-semibold transition hover:border-charcoal-900"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="8" cy="17" r="2" />
          </svg>
          <span className="hidden sm:inline">Filters</span>
          {filterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1 text-xs font-bold text-white">
              {filterCount}
            </span>
          )}
        </button>
        <InstallButton className="hidden md:inline-flex" />
        <UserMenu className="shrink-0" />
      </header>

      {notice && (
        <div role="status" className="z-30 flex items-start gap-3 bg-charcoal-900 px-4 py-2.5 text-sm text-white">
          <p className="flex-1">{notice}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-white/70 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ── map + list ── */}
      <main className="relative min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(420px,540px)_1fr]">
        <div className="absolute inset-0 lg:relative lg:inset-auto lg:order-2 lg:h-full">
          {center ? (
            <MapView
              initialCenter={center}
              focus={focus}
              user={userPos}
              listings={listings}
              activeId={activeId}
              hoverId={hoverId}
              bottomPad={bottomPad}
              onSelect={handlePinSelect}
              onSearchArea={(c) => {
                setCenter(c);
                setLabel('Map area');
                setActiveId(null);
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-sand-100 text-sm font-medium text-charcoal-500">
              Finding your location…
            </div>
          )}

          {/* desktop floating button */}
          <div className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 lg:block">
            <AroundMeButton onClick={handleAroundMe} loading={locating} />
          </div>
        </div>

        <ListPanel
          listings={listings}
          distanceLabels={distanceLabels}
          loading={loading}
          error={error}
          offline={offline}
          title={title}
          activeId={activeId}
          onActivate={setActiveId}
          onHover={setHoverId}
          snap={snap}
          onSnap={setSnap}
          hasFilters={filterCount > 0}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
          floating={
            <div className="absolute -top-16 right-3 lg:hidden">
              <AroundMeButton onClick={handleAroundMe} loading={locating} />
            </div>
          }
        />
      </main>

      <FiltersModal open={filtersOpen} filters={filters} onApply={setFilters} onClose={() => setFiltersOpen(false)} />
    </div>
  );
}

// ── offline fallback storage (best-effort) ─────────────────────
function saveSearch(s: SavedSearch) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or unavailable */
  }
}

function loadSearch(): SavedSearch | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch) : null;
  } catch {
    return null;
  }
}

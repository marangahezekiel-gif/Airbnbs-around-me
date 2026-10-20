'use client';

/**
 * Results list.
 *  - Desktop (lg+): a normal left column next to the map.
 *  - Mobile: a draggable bottom sheet over the map with three snap points
 *    (collapsed / half / full) — the same gesture pattern native map apps use.
 */
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import type { Listing } from '@/lib/types';
import { ListingCard, ListingCardSkeleton } from './ListingCard';

export type Snap = 'collapsed' | 'half' | 'full';

const COLLAPSED_PX = 132;
const HALF = 0.5;
const FULL = 0.92;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

interface Props {
  listings: Listing[];
  distanceLabels: Record<string, string>;
  loading: boolean;
  error: string | null;
  offline: boolean;
  title: string;
  activeId: string | null;
  onActivate: (id: string) => void;
  onHover: (id: string | null) => void;
  snap: Snap;
  onSnap: (s: Snap) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  /** Floating controls that ride on top of the sheet (mobile "Around me now") */
  floating?: ReactNode;
}

export function ListPanel({
  listings,
  distanceLabels,
  loading,
  error,
  offline,
  title,
  activeId,
  onActivate,
  onHover,
  snap,
  onSnap,
  hasFilters,
  onClearFilters,
  floating,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const [dragH, setDragH] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; parentH: number; moved: boolean } | null>(null);

  // Scroll the list to the active card (when a map pin was tapped)
  useEffect(() => {
    if (!activeId) return;
    document.getElementById(`card-${activeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const panel = panelRef.current;
    if (!panel || !panel.parentElement) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      startY: e.clientY,
      startH: panel.offsetHeight,
      parentH: panel.parentElement.clientHeight,
      moved: false,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    if (Math.abs(dy) > 4) d.moved = true;
    if (d.moved) setDragH(clamp(d.startH + dy, COLLAPSED_PX, d.parentH * FULL));
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;

    if (!d.moved) {
      // A tap on the handle cycles through the snap points
      onSnap(snap === 'collapsed' ? 'half' : snap === 'half' ? 'full' : 'half');
      return;
    }

    const finalH = panelRef.current?.offsetHeight ?? d.startH;
    const targets: [Snap, number][] = [
      ['collapsed', COLLAPSED_PX],
      ['half', d.parentH * HALF],
      ['full', d.parentH * FULL],
    ];
    const nearest = targets.reduce((best, t) => (Math.abs(t[1] - finalH) < Math.abs(best[1] - finalH) ? t : best));
    onSnap(nearest[0]);
    setDragH(null);
  }

  const sheetHeight =
    dragH != null ? `${dragH}px` : snap === 'collapsed' ? `${COLLAPSED_PX}px` : snap === 'half' ? '50%' : '92%';

  return (
    <section
      ref={panelRef}
      aria-label="Search results"
      style={{ '--sheet-h': sheetHeight } as CSSProperties}
      className={`absolute inset-x-0 bottom-0 z-20 flex h-[var(--sheet-h)] flex-col rounded-t-3xl bg-white shadow-sheet lg:relative lg:z-auto lg:order-1 lg:h-full lg:min-h-0 lg:rounded-none lg:border-r lg:border-charcoal-100 lg:shadow-none ${
        dragH == null ? 'transition-[height] duration-300 ease-out' : ''
      }`}
    >
      {floating}

      {/* drag handle (mobile only) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Resize results panel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSnap(snap === 'collapsed' ? 'half' : snap === 'half' ? 'full' : 'collapsed');
        }}
        className="flex cursor-grab touch-none select-none justify-center pb-1 pt-3 active:cursor-grabbing lg:hidden"
      >
        <span className="h-1.5 w-11 rounded-full bg-charcoal-200" />
      </div>

      <div className="px-4 pb-3 pt-1 lg:pt-4">
        <h2 className="text-[15px] font-bold">{loading && listings.length === 0 ? 'Searching…' : title}</h2>
        {offline && (
          <p className="mt-1 text-sm font-medium text-coral-700">
            You’re offline — showing your last saved results.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {error && listings.length === 0 ? (
          <div className="mx-2 rounded-2xl bg-coral-50 p-5 text-sm text-coral-700">{error}</div>
        ) : loading && listings.length === 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="mx-2 rounded-2xl bg-charcoal-50 p-6 text-center">
            <p className="font-bold">No stays match here</p>
            <p className="mt-1 text-sm text-charcoal-500">
              Try zooming the map, searching another place
              {hasFilters ? ' or clearing your filters' : ''}.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 rounded-full bg-charcoal-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div
            className={`grid gap-2 transition-opacity sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 ${
              loading ? 'opacity-60' : ''
            }`}
          >
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                distanceLabel={distanceLabels[l.id] ?? ''}
                active={l.id === activeId}
                onActivate={onActivate}
                onHover={onHover}
              />
            ))}
          </div>
        )}

        <p className="mt-6 px-3 text-center text-xs leading-relaxed text-charcoal-400">
          Not affiliated with Airbnb, Inc. Listings sourced via public data. Some links are affiliate links.
        </p>
      </div>
    </section>
  );
}

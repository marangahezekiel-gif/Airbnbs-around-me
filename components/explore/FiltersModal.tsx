'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FILTERS, type Filters } from '@/lib/filters';
import { AMENITIES } from '@/lib/mock-data';
import type { PropertyType } from '@/lib/types';

interface Props {
  open: boolean;
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
}

const TYPES: { value: PropertyType; label: string; hint: string }[] = [
  { value: 'entire_place', label: 'Entire place', hint: 'Have it all to yourself' },
  { value: 'private_room', label: 'Private room', hint: 'Your own room, shared home' },
];
const BEDROOM_OPTIONS = [0, 1, 2, 3, 4];
const RADII = [2, 5, 10, 20, 50];

/** Filters dialog: bottom sheet on phones, centred modal on larger screens. */
export function FiltersModal({ open, filters, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);

  // Reset the draft each time the dialog opens
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  // Lock page scroll + close on Escape while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const parsePrice = (v: string): number | null => {
    if (v.trim() === '') return null;
    const n = Math.max(0, Math.round(Number(v)));
    return Number.isFinite(n) ? n : null;
  };

  function apply() {
    let { minPrice, maxPrice } = draft;
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
    onApply({ ...draft, minPrice, maxPrice });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Filters">
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-charcoal-900/50" />

      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-float sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-charcoal-100 px-6 py-4">
          <h2 className="text-lg font-extrabold">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-xl leading-none hover:bg-charcoal-100">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          {/* Price */}
          <section>
            <h3 className="font-bold">Price per night</h3>
            <div className="mt-3 flex items-center gap-3">
              {(['minPrice', 'maxPrice'] as const).map((key) => (
                <label key={key} className="flex-1 rounded-2xl border border-charcoal-200 px-4 py-2.5 focus-within:border-charcoal-900">
                  <span className="block text-xs text-charcoal-500">{key === 'minPrice' ? 'Minimum' : 'Maximum'}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-charcoal-500">$</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder={key === 'minPrice' ? 'No min' : 'No max'}
                      value={draft[key] ?? ''}
                      onChange={(e) => setDraft({ ...draft, [key]: parsePrice(e.target.value) })}
                      className="w-full bg-transparent outline-none"
                    />
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Property type */}
          <section>
            <h3 className="font-bold">Type of place</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {TYPES.map((t) => {
                const on = draft.types.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft({ ...draft, types: toggle(draft.types, t.value) })}
                    className={`rounded-2xl border p-4 text-left transition ${on ? 'border-charcoal-900 bg-charcoal-50 ring-1 ring-charcoal-900' : 'border-charcoal-200 hover:border-charcoal-900'}`}
                  >
                    <span className="block font-semibold">{t.label}</span>
                    <span className="mt-0.5 block text-xs text-charcoal-500">{t.hint}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Bedrooms */}
          <section>
            <h3 className="font-bold">Bedrooms</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {BEDROOM_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={draft.bedrooms === n}
                  onClick={() => setDraft({ ...draft, bedrooms: n })}
                  className={`min-w-14 rounded-full border px-4 py-2 text-sm font-semibold transition ${draft.bedrooms === n ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-charcoal-200 hover:border-charcoal-900'}`}
                >
                  {n === 0 ? 'Any' : n === 4 ? '4+' : n}
                </button>
              ))}
            </div>
          </section>

          {/* Amenities */}
          <section>
            <h3 className="font-bold">Amenities</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const on = draft.amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft({ ...draft, amenities: toggle(draft.amenities, a) })}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${on ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-charcoal-200 hover:border-charcoal-900'}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Instant book */}
          <section className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-bold">Instant Book</h3>
              <p className="text-sm text-charcoal-500">Only stays you can book without waiting for host approval</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.instantBook}
              onClick={() => setDraft({ ...draft, instantBook: !draft.instantBook })}
              className={`relative h-8 w-14 shrink-0 rounded-full transition ${draft.instantBook ? 'bg-coral-500' : 'bg-charcoal-200'}`}
            >
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${draft.instantBook ? 'left-7' : 'left-1'}`} />
            </button>
          </section>

          {/* Radius */}
          <section>
            <h3 className="font-bold">Search radius</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={draft.radiusKm === r}
                  onClick={() => setDraft({ ...draft, radiusKm: r })}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${draft.radiusKm === r ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-charcoal-200 hover:border-charcoal-900'}`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-charcoal-100 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => setDraft(DEFAULT_FILTERS)} className="text-sm font-semibold underline underline-offset-4">
            Clear all
          </button>
          <button type="button" onClick={apply} className="rounded-full bg-charcoal-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-charcoal-800 active:scale-95">
            Show stays
          </button>
        </div>
      </div>
    </div>
  );
}

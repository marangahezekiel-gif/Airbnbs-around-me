'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { searchPlaces } from '@/lib/geocode';
import type { Place } from '@/lib/types';

interface Props {
  onSelectPlace: (place: Place) => void;
  onUseLocation: () => void;
  className?: string;
}

/** Place search with debounced autocomplete suggestions. */
export function SearchBar({ onSelectPlace, onUseLocation, className = '' }: Props) {
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [busy, setBusy] = useState(false);

  // Debounced autocomplete
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        setResults(await searchPlaces(q, ctrl.signal));
        setHighlight(-1);
      } catch {
        /* aborted or offline – ignore */
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function choose(place: Place) {
    setQuery(place.name.split(',').slice(0, 2).join(','));
    setOpen(false);
    onSelectPlace(place);
  }

  async function submit() {
    const target = highlight >= 0 ? results[highlight] : results[0];
    if (target) return choose(target);
    const q = query.trim();
    if (q.length < 2) return;
    try {
      const found = await searchPlaces(q);
      if (found[0]) choose(found[0]);
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-full border border-charcoal-200 bg-white px-4 py-2.5 shadow-pin transition focus-within:border-charcoal-900">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 text-charcoal-500" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          placeholder="Search a city or address"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(results.length - 1, h + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(-1, h - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-charcoal-400"
        />
        {busy && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-charcoal-200 border-t-charcoal-700" aria-hidden="true" />}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-charcoal-100 bg-white p-1.5 shadow-float"
        >
          <li role="option" aria-selected="false">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onUseLocation();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-coral-600 hover:bg-coral-50"
            >
              <span aria-hidden="true">◎</span> Use my current location
            </button>
          </li>
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onClick={() => choose(p)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${i === highlight ? 'bg-charcoal-50' : 'hover:bg-charcoal-50'}`}
              >
                {p.name}
              </button>
            </li>
          ))}
          {query.trim().length >= 3 && !busy && results.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-charcoal-500">No places found</li>
          )}
        </ul>
      )}
    </div>
  );
}

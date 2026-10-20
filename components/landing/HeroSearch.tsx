'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

/** Hero call-to-action: search a place, or jump straight to "stays near me". */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore?locate=1');
  }

  return (
    <div className="w-full max-w-xl">
      <button
        type="button"
        onClick={() => router.push('/explore?locate=1')}
        className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-coral-500 px-6 py-4 text-lg font-extrabold text-white shadow-float transition hover:bg-coral-600 active:scale-[.98] sm:w-auto"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        Find stays near me
        <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
      </button>

      <p className="my-4 text-sm font-medium text-charcoal-400">or search anywhere</p>

      <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-full border border-charcoal-200 bg-white p-1.5 pl-5 shadow-card focus-within:border-charcoal-900">
        <label htmlFor="hero-q" className="sr-only">City or address</label>
        <input
          id="hero-q"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, neighbourhood or address"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-charcoal-400"
        />
        <button type="submit" className="rounded-full bg-charcoal-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-charcoal-800">
          Search
        </button>
      </form>
    </div>
  );
}

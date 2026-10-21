'use client';

/**
 * Two-month calendar frame with previous/next navigation. It only draws the
 * grid; what each day looks like and does is up to `cell`, so the guest's
 * date-range picker and the host's "block dates" editor share one calendar.
 */
import { useEffect, useState, type ReactNode } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

interface Props {
  /** Render one selectable day. `iso` is yyyy-mm-dd; `past` is true for days before today. */
  cell: (iso: string, day: number, past: boolean) => ReactNode;
  /** How many months ahead the user may browse */
  maxOffset?: number;
}

export function Months({ cell, maxOffset = 12 }: Props) {
  // "Today" is read on the client only, so server and client HTML never disagree
  const [today, setToday] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = new Date();
    setToday(isoLocal(t.getFullYear(), t.getMonth(), t.getDate()));
  }, []);

  if (!today) return <div className="h-72 animate-pulse rounded-3xl bg-charcoal-50" aria-hidden="true" />;

  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const months = [first, new Date(first.getFullYear(), first.getMonth() + 1, 1)];

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          aria-label="Previous month"
          className="rounded-full border border-charcoal-200 px-3.5 py-2 font-bold transition hover:border-charcoal-900 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))}
          aria-label="Next month"
          className="rounded-full border border-charcoal-200 px-3.5 py-2 font-bold transition hover:border-charcoal-900"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid gap-8 md:grid-cols-2">
        {months.map((m, idx) => {
          const lead = m.getDay();
          const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          return (
            <div key={`${m.getFullYear()}-${m.getMonth()}`} className={idx === 1 ? 'hidden md:block' : ''}>
              <h4 className="mb-3 text-center font-bold">{MONTH_FMT.format(m)}</h4>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-charcoal-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className="py-1">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: lead }, (_, i) => (
                  <span key={`e${i}`} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const day = i + 1;
                  const iso = isoLocal(m.getFullYear(), m.getMonth(), day);
                  return <span key={iso}>{cell(iso, day, iso < today)}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

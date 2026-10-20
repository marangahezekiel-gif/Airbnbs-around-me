'use client';

import { useEffect, useMemo, useState } from 'react';

interface Props {
  listingId: string;
  /** Link the "check these dates" button points to (affiliate URL) */
  airbnbUrl: string;
  /** Real unavailable dates (yyyy-mm-dd) when your data source provides them */
  blockedDates?: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);
const MONTH_FMT = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const SHORT_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Append check-in/out dates (Airbnb uses different param names on search vs room pages, so set both). */
function withDates(url: string, start: string | null, end: string | null): string {
  if (!start || !end) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('check_in', start);
    u.searchParams.set('check_out', end);
    u.searchParams.set('checkin', start);
    u.searchParams.set('checkout', end);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Two-month availability calendar with range selection.
 * Without real availability data, blocked days are generated deterministically
 * from the listing id and the UI says they're indicative.
 */
export function AvailabilityCalendar({ listingId, airbnbUrl, blockedDates }: Props) {
  const [today, setToday] = useState<Date | null>(null);
  const [offset, setOffset] = useState(0);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  // Read "today" on the client only (avoids server/client date mismatches)
  useEffect(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setToday(t);
  }, []);

  const blockedSet = useMemo(() => (blockedDates ? new Set(blockedDates) : null), [blockedDates]);
  const isBlocked = (d: string) => (blockedSet ? blockedSet.has(d) : hash(`${listingId}:${d}`) % 100 < 26);

  if (!today) {
    return <div className="h-72 animate-pulse rounded-3xl bg-charcoal-50" aria-hidden="true" />;
  }

  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const months = [base, new Date(base.getFullYear(), base.getMonth() + 1, 1)];
  const todayIso = iso(today);

  function rangeHasBlocked(a: string, b: string) {
    for (let d = parse(a); iso(d) < b; d.setDate(d.getDate() + 1)) {
      if (isBlocked(iso(d))) return true;
    }
    return false;
  }

  function pick(day: string) {
    if (!start || end) {
      setStart(day);
      setEnd(null);
    } else if (day <= start || rangeHasBlocked(start, day)) {
      setStart(day);
    } else {
      setEnd(day);
    }
  }

  const nights = start && end ? Math.round((parse(end).getTime() - parse(start).getTime()) / 86_400_000) : 0;

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
          onClick={() => setOffset((o) => Math.min(10, o + 1))}
          aria-label="Next month"
          className="rounded-full border border-charcoal-200 px-3.5 py-2 font-bold transition hover:border-charcoal-900"
        >
          ›
        </button>
      </div>

      <div className="mt-2 grid gap-8 md:grid-cols-2">
        {months.map((m, idx) => {
          const first = m.getDay();
          const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          const cells: (number | null)[] = [...Array<null>(first).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
          return (
            <div key={m.toISOString()} className={idx === 1 ? 'hidden md:block' : ''}>
              <h4 className="mb-3 text-center font-bold">{MONTH_FMT.format(m)}</h4>
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-charcoal-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className="py-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {cells.map((day, i) => {
                  if (day === null) return <span key={`e${i}`} />;
                  const date = iso(new Date(m.getFullYear(), m.getMonth(), day));
                  const past = date < todayIso;
                  const blocked = isBlocked(date);
                  const disabled = past || blocked;
                  const isEdge = date === start || date === end;
                  const inRange = start && end && date > start && date < end;
                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(date)}
                      aria-label={`${SHORT_FMT.format(parse(date))}${blocked ? ', unavailable' : ''}`}
                      aria-pressed={isEdge || Boolean(inRange)}
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
                        isEdge
                          ? 'bg-charcoal-900 font-bold text-white'
                          : inRange
                            ? 'rounded-none bg-coral-50 font-semibold'
                            : disabled
                              ? 'text-charcoal-300 ' + (blocked && !past ? 'line-through' : '')
                              : 'font-medium hover:border hover:border-charcoal-900'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-charcoal-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-charcoal-600">
          {start && end ? (
            <>
              <b className="text-charcoal-900">
                {nights} night{nights > 1 ? 's' : ''}
              </b>{' '}
              · {SHORT_FMT.format(parse(start))} – {SHORT_FMT.format(parse(end))}
            </>
          ) : start ? (
            'Now pick your check-out date.'
          ) : (
            'Pick your check-in and check-out dates.'
          )}
        </p>
        <a
          href={withDates(airbnbUrl, start, end)}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className="rounded-full bg-coral-500 px-5 py-2.5 text-center text-sm font-bold text-white transition hover:bg-coral-600"
        >
          {start && end ? 'Check these dates on Airbnb' : 'View on Airbnb'}
        </a>
      </div>
      <p className="mt-3 text-xs text-charcoal-400">
        Availability shown here is indicative. Always confirm dates and final pricing on Airbnb before booking.
      </p>
    </div>
  );
}

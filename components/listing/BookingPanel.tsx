'use client';

/**
 * "Book your stay" for host-created listings: pick dates on a calendar that
 * knows the host's closed days and how many units are left, then send a
 * request (or book instantly when the host enabled Instant Book).
 *
 * Nothing is charged here — hosts and guests settle payment directly.
 * Plug a payment provider (Stripe Checkout, etc.) into POST /api/bookings
 * when you're ready.
 */
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRoleSwitch } from '@/components/auth/useRoleSwitch';
import { formatPrice, formatStay } from '@/lib/format';
import { addDays, freeUnits, fullyBookedDates, nightsBetween, todayIso } from '@/lib/marketplace/availability';
import type { Booking, OccupiedRange, Unit } from '@/lib/marketplace/types';
import { DateRangePicker, type Range } from './DateRangePicker';

interface Props {
  listingId: string;
  hostId: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  instantBook: boolean;
  units: Unit[];
  occupied: OccupiedRange[];
  blockedDates: string[];
}

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string } | { kind: 'done'; booking: Booking };

const field = 'w-full rounded-2xl border border-charcoal-200 bg-white px-4 py-3 text-base outline-none transition focus:border-charcoal-900';

export function BookingPanel(p: Props) {
  const { data: session, status } = useSession();
  const { switchTo, busy: switching, error: switchError } = useRoleSwitch();
  const here = `/listing/${encodeURIComponent(p.listingId)}`;

  const blocked = useMemo(() => [...p.blockedDates, ...fullyBookedDates(p.units, p.occupied)], [p.blockedDates, p.units, p.occupied]);
  const [range, setRange] = useState<Range>({ start: null, end: null });
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [tonight, setTonight] = useState<number | null>(null);

  // "Units free tonight" is computed in the browser so it reflects the visitor's own clock
  useEffect(() => {
    const t = todayIso();
    setTonight(freeUnits(p.units, p.occupied, t, addDays(t, 1)).length);
  }, [p.units, p.occupied]);

  const { start, end } = range;
  const nights = start && end ? nightsBetween(start, end) : 0;
  const free = start && end ? freeUnits(p.units, p.occupied, start, end).length : null;
  const total = nights * p.pricePerNight;

  async function submit() {
    if (!start || !end) return setState({ kind: 'error', message: 'Choose your check-in and check-out dates first.' });
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: p.listingId, checkIn: start, checkOut: end, guests, note }),
      });
      const data = (await res.json().catch(() => ({}))) as { booking?: Booking; error?: string };
      if (!res.ok || !data.booking) return setState({ kind: 'error', message: data.error ?? 'Could not send your request.' });
      setState({ kind: 'done', booking: data.booking });
    } catch {
      setState({ kind: 'error', message: 'Network problem — check your connection and try again.' });
    }
  }

  // ── who is looking? ──
  let gate: React.ReactNode = null;
  if (status === 'loading') gate = <p className="text-sm text-charcoal-500">Checking your account…</p>;
  else if (!session?.user) {
    gate = (
      <div className="space-y-2">
        <Link href={`/signin?callbackUrl=${encodeURIComponent(here)}`} className="block rounded-full bg-coral-500 px-5 py-3.5 text-center font-bold text-white transition hover:bg-coral-600">
          Sign in to {p.instantBook ? 'book' : 'request this stay'}
        </Link>
        <p className="text-center text-sm text-charcoal-500">
          New here?{' '}
          <Link href={`/signup?callbackUrl=${encodeURIComponent(here)}`} className="font-bold text-charcoal-900 underline">
            Create a guest account
          </Link>
        </p>
      </div>
    );
  } else if (session.user.id === p.hostId) {
    gate = <p className="rounded-2xl bg-charcoal-50 px-4 py-3 text-sm font-semibold">This is your own listing. Manage it from your host dashboard.</p>;
  } else if (session.user.role === 'host') {
    gate = (
      <div className="space-y-3">
        <p className="rounded-2xl bg-charcoal-50 px-4 py-3 text-sm font-semibold">You’re using a host account. Switch to a guest account to book stays.</p>
        <button
          type="button"
          disabled={switching}
          onClick={() => switchTo('guest', here)}
          className="w-full rounded-full bg-charcoal-900 px-5 py-3 font-bold text-white transition hover:bg-charcoal-700 disabled:opacity-60"
        >
          {switching ? 'Switching…' : 'Switch to guest'}
        </button>
        {switchError && <p className="text-sm font-semibold text-coral-700">{switchError}</p>}
      </div>
    );
  }

  if (state.kind === 'done') {
    const b = state.booking;
    return (
      <div role="status" className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <p className="text-lg font-extrabold text-emerald-900">{b.status === 'accepted' ? 'You’re booked! 🎉' : 'Request sent!'}</p>
        <p className="mt-1 text-emerald-900">
          {formatStay(b.checkIn, b.checkOut)} · {b.nights} night{b.nights > 1 ? 's' : ''} · {formatPrice(b.totalPrice, b.currency)}
        </p>
        <p className="mt-2 text-sm text-emerald-800">
          {b.status === 'accepted' ? 'The host confirmed your stay automatically.' : 'The host will accept or decline soon. You’ll see the answer under My trips.'}
        </p>
        <Link href="/trips" className="mt-4 inline-block rounded-full bg-emerald-900 px-5 py-2.5 text-sm font-bold text-white">
          Go to my trips
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-charcoal-600">
        {tonight === null
          ? `${p.units.length} unit${p.units.length > 1 ? 's' : ''} in total`
          : tonight === 0
            ? `All ${p.units.length} unit${p.units.length > 1 ? 's are' : ' is'} booked tonight`
            : `${tonight} of ${p.units.length} unit${p.units.length > 1 ? 's' : ''} free tonight`}
      </p>

      <div className="mt-4">
        <DateRangePicker blocked={blocked} value={range} onChange={setRange} />
      </div>

      <div className="mt-6 space-y-4 rounded-3xl bg-charcoal-50 p-5">
        <p className="text-sm text-charcoal-600">
          {start && end ? (
            <>
              <b className="text-charcoal-900">{formatStay(start, end)}</b> · {nights} night{nights > 1 ? 's' : ''}
            </>
          ) : start ? (
            'Now pick your check-out date.'
          ) : (
            'Pick your check-in and check-out dates.'
          )}
        </p>

        {free !== null && (
          <p className={`text-sm font-semibold ${free <= 1 ? 'text-coral-700' : 'text-charcoal-700'}`}>
            {free} of {p.units.length} unit{p.units.length > 1 ? 's' : ''} left for your dates
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Guests</span>
          <select className={field} value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {Array.from({ length: p.maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} guest{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </label>

        {!p.instantBook && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Message to the host (optional)</span>
            <textarea className={`${field} min-h-24`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Say hello and tell them about your trip." />
          </label>
        )}

        {nights > 0 && (
          <dl className="space-y-1 border-t border-charcoal-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt>
                {formatPrice(p.pricePerNight, p.currency)} × {nights} night{nights > 1 ? 's' : ''}
              </dt>
              <dd>{formatPrice(total, p.currency)}</dd>
            </div>
            <div className="flex justify-between text-base font-extrabold">
              <dt>Total</dt>
              <dd>{formatPrice(total, p.currency)}</dd>
            </div>
          </dl>
        )}

        {gate ?? (
          <button
            type="button"
            onClick={submit}
            disabled={state.kind === 'sending' || free === 0}
            className="w-full rounded-full bg-coral-500 px-5 py-3.5 font-bold text-white transition hover:bg-coral-600 active:scale-[.98] disabled:opacity-60"
          >
            {state.kind === 'sending' ? 'Sending…' : p.instantBook ? 'Book now' : 'Request to book'}
          </button>
        )}

        {state.kind === 'error' && (
          <p role="alert" className="text-sm font-semibold text-coral-700">
            {state.message}
          </p>
        )}
        <p className="text-xs text-charcoal-400">
          {p.instantBook ? 'Instant Book: confirmed straight away.' : 'You won’t be charged. The host replies to your request first.'}
        </p>
      </div>
    </div>
  );
}

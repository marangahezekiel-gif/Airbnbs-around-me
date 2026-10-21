'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Accept / reject buttons for a pending booking request. */
export function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: 'accept' | 'reject') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/host/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Something went wrong.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network problem — try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => decide('accept')}
          className="rounded-full bg-charcoal-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-charcoal-700 disabled:opacity-60"
        >
          {busy === 'accept' ? 'Accepting…' : 'Accept'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => decide('reject')}
          className="rounded-full border border-charcoal-200 px-5 py-2.5 text-sm font-bold transition hover:border-charcoal-900 disabled:opacity-60"
        >
          {busy === 'reject' ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}
    </div>
  );
}

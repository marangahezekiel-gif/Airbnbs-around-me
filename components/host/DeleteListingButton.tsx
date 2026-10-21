'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteListingButton({ listingId, title, bookingCount }: { listingId: string; title: string; bookingCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const warning = bookingCount > 0 ? `\n\nThis also deletes its ${bookingCount} booking${bookingCount > 1 ? 's' : ''}.` : '';
    if (!window.confirm(`Delete “${title}”? This can’t be undone.${warning}`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/host/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not delete.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network problem — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold text-coral-700 transition hover:border-coral-500 disabled:opacity-60"
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      {error && (
        <span role="alert" className="text-sm font-semibold text-coral-700">
          {error}
        </span>
      )}
    </>
  );
}

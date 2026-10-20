'use client';

import { useEffect, useState } from 'react';
import { pushSupported, subscribeToPriceDrops, VAPID_PUBLIC_KEY, type PushResult } from '@/lib/push';

/** "Notify me of price drops" — only rendered when push is configured and supported. */
export function PriceAlertButton({ listingId, price }: { listingId: string; price: number }) {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<'idle' | 'working' | PushResult>('idle');

  useEffect(() => {
    setAvailable(Boolean(VAPID_PUBLIC_KEY) && pushSupported());
  }, []);

  if (!available) return null;

  async function onClick() {
    setState('working');
    setState(await subscribeToPriceDrops(listingId, price));
  }

  const label =
    state === 'subscribed'
      ? '✓ We’ll notify you of price drops'
      : state === 'denied'
        ? 'Notifications are blocked in your browser'
        : state === 'error'
          ? 'Couldn’t set that up — try again'
          : state === 'working'
            ? 'Setting up…'
            : 'Notify me of price drops';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'working' || state === 'subscribed'}
      className="mt-3 w-full rounded-full border border-charcoal-200 px-5 py-3 text-sm font-semibold transition hover:border-charcoal-900 disabled:opacity-70"
    >
      {label}
    </button>
  );
}

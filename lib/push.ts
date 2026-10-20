/**
 * Client helpers for optional price-drop push notifications.
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY (see README → "Push notifications").
 */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushResult = 'subscribed' | 'denied' | 'unsupported' | 'error';

/** Ask permission, subscribe this device and register a price alert on the server. */
export async function subscribeToPriceDrops(listingId: string, price: number): Promise<PushResult> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }));

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, listingId, price }),
    });
    return res.ok ? 'subscribed' : 'error';
  } catch {
    return 'error';
  }
}

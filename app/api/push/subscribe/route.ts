import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/subscribe  { subscription, listingId, price }
 *
 * STUB: validates and logs the subscription. To make price-drop alerts real:
 *  1. Persist `subscription` + `listingId` + `price` (Vercel KV / Postgres).
 *  2. Add a Vercel Cron job that re-checks prices and, on a drop, sends a push
 *     with the `web-push` npm package using your VAPID keys (see README).
 */
export async function POST(req: NextRequest) {
  let body: { subscription?: { endpoint?: string }; listingId?: string; price?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.subscription?.endpoint || !body.listingId) {
    return NextResponse.json({ error: 'subscription and listingId are required' }, { status: 400 });
  }

  // TODO: persist to your database here.
  console.log('[push] new price alert', { listingId: body.listingId, price: body.price });
  return NextResponse.json({ ok: true }, { status: 202 });
}

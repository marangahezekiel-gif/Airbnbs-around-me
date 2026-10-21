import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { createBooking } from '@/lib/marketplace/repo';
import { bookingRequestSchema, firstIssue } from '@/lib/marketplace/schemas';
import { allow } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings  { listingId, checkIn, checkOut, guests, note }
 * Guests only. Creates a pending request — or an accepted booking straight
 * away when the listing has Instant Book on.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser('guest');
  if ('response' in auth) return auth.response;
  if (!allow(`booking:${auth.user.id}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const body = bookingRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: firstIssue(body.error) }, { status: 400 });

  const result = await createBooking(auth.user, body.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ booking: result.value }, { status: 201 });
}

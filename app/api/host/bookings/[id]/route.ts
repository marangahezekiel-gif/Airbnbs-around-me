import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { decideBooking } from '@/lib/marketplace/repo';
import { bookingDecisionSchema } from '@/lib/marketplace/schemas';

export const dynamic = 'force-dynamic';

/** PATCH /api/host/bookings/:id  { action: 'accept' | 'reject' } */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiUser('host');
  if ('response' in auth) return auth.response;

  const body = bookingDecisionSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Choose accept or reject.' }, { status: 400 });

  const result = await decideBooking(params.id, auth.user.id, body.data.action);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ booking: result.value });
}

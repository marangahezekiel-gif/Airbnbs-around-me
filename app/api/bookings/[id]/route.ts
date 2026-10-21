import { NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { cancelBooking } from '@/lib/marketplace/repo';

export const dynamic = 'force-dynamic';

/** DELETE /api/bookings/:id → the guest cancels their own pending or accepted booking */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const result = await cancelBooking(params.id, auth.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ booking: result.value });
}

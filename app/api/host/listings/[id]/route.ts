import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { deleteListing, getListing, updateListing } from '@/lib/marketplace/repo';
import { firstIssue, listingInputSchema } from '@/lib/marketplace/schemas';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

/** A host may only touch their own listings. 404 (not 403) so ids can't be probed. */
async function ownedListing(id: string, hostId: string) {
  const listing = await getListing(id);
  return listing && listing.hostId === hostId ? listing : null;
}

/** PUT /api/host/listings/:id → replace the listing's details */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requireApiUser('host');
  if ('response' in auth) return auth.response;
  if (!(await ownedListing(params.id, auth.user.id))) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

  const body = listingInputSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: firstIssue(body.error) }, { status: 400 });

  try {
    const listing = await updateListing(params.id, body.data);
    return NextResponse.json({ listing });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNITS_IN_USE') {
      return NextResponse.json(
        { error: 'You can’t reduce the number of units below what upcoming accepted stays need.' },
        { status: 409 },
      );
    }
    console.error('[api/host/listings PUT]', err);
    return NextResponse.json({ error: 'Could not save the listing.' }, { status: 500 });
  }
}

/** DELETE /api/host/listings/:id → delete the listing, its units and its bookings */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireApiUser('host');
  if ('response' in auth) return auth.response;
  if (!(await ownedListing(params.id, auth.user.id))) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

  await deleteListing(params.id);
  return NextResponse.json({ ok: true });
}

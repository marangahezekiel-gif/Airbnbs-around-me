import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { createListing, listListingsByHost } from '@/lib/marketplace/repo';
import { firstIssue, listingInputSchema } from '@/lib/marketplace/schemas';

export const dynamic = 'force-dynamic';

/** GET /api/host/listings → the signed-in host's listings */
export async function GET() {
  const auth = await requireApiUser('host');
  if ('response' in auth) return auth.response;
  return NextResponse.json({ listings: await listListingsByHost(auth.user.id) });
}

/** POST /api/host/listings → create a listing (body validated by listingInputSchema) */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser('host');
  if ('response' in auth) return auth.response;

  const body = listingInputSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: firstIssue(body.error) }, { status: 400 });

  try {
    const listing = await createListing(auth.user.id, body.data);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (err) {
    console.error('[api/host/listings POST]', err);
    return NextResponse.json({ error: 'Could not save the listing.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/api-auth';
import { setProfileRole } from '@/lib/marketplace/repo';
import { roleSchema } from '@/lib/marketplace/schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/account/role  { role: 'host' | 'guest' }
 * Switches the signed-in user's role. The client then calls NextAuth's
 * `update()` so the session cookie picks up the new role.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if ('response' in auth) return auth.response;

  const body = roleSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Choose host or guest.' }, { status: 400 });

  await setProfileRole(auth.user.id, body.data.role);
  return NextResponse.json({ role: body.data.role });
}

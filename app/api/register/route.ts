import { NextRequest, NextResponse } from 'next/server';
import { createProfile, getProfileByEmail } from '@/lib/marketplace/repo';
import { firstIssue, registerSchema } from '@/lib/marketplace/schemas';
import { hashPassword } from '@/lib/password';
import { allow, clientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** POST /api/register  { name, email, password, role: 'host' | 'guest' } */
export async function POST(req: NextRequest) {
  if (!allow(`register:${clientIp(req.headers)}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many sign-ups from this network. Try again later.' }, { status: 429 });
  }

  const body = registerSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: firstIssue(body.error) }, { status: 400 });
  const { name, email, password, role } = body.data;

  try {
    if (await getProfileByEmail(email)) {
      return NextResponse.json({ error: 'An account with this email already exists. Sign in instead.' }, { status: 409 });
    }
    await createProfile({ name, email, role, passwordHash: await hashPassword(password) });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[api/register]', err);
    return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 });
  }
}

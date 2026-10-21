/** Auth guard for route handlers: returns the user, or a ready-made 401/403 response. */
import { NextResponse } from 'next/server';
import { getOptionalUser, type SessionUser } from './auth';
import type { Role } from './marketplace/types';

export async function requireApiUser(role?: Role): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getOptionalUser();
  if (!user) return { response: NextResponse.json({ error: 'Please sign in first.' }, { status: 401 }) };
  if (role && user.role !== role) {
    const msg = role === 'host' ? 'Switch to a host account to do this.' : 'Switch to a guest account to do this.';
    return { response: NextResponse.json({ error: msg, needRole: role }, { status: 403 }) };
  }
  return { user };
}

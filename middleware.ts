/**
 * Route protection (runs on the edge, before the page renders).
 *
 *   /host/*    → signed in AND role = host
 *   /trips/*   → signed in
 *   /account/* → signed in
 *
 * This is the fast first gate based on the signed cookie. Every protected page
 * and API route ALSO re-checks the role against the database, so a stale
 * cookie can never grant access on its own.
 */
import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_SECRET } from '@/lib/auth-secret';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: AUTH_SECRET });
  const { pathname, search } = req.nextUrl;
  const here = pathname + search;

  if (!token) {
    const url = new URL('/signin', req.url);
    url.searchParams.set('callbackUrl', here);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/host') && token.role !== 'host') {
    const url = new URL('/account', req.url);
    url.searchParams.set('need', 'host');
    url.searchParams.set('next', here);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/host/:path*', '/trips/:path*', '/account/:path*'] };

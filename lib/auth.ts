/**
 * Authentication (NextAuth v4, credentials + signed JWT cookie).
 *
 *  - Email + password accounts live in the `profiles` table (scrypt hashes).
 *  - The session carries `id` and `role` ('host' | 'guest').
 *  - Switching role = POST /api/account/role, then `update()` on the client,
 *    which makes the jwt callback below re-read the role from the database.
 *
 * Want passwordless magic links instead? Add NextAuth's EmailProvider (needs
 * an SMTP server and an adapter) next to the credentials provider below.
 */
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { redirect } from 'next/navigation';
import { AUTH_SECRET } from './auth-secret';
import { getProfileByEmail, getProfileById } from './marketplace/repo';
import type { Role } from './marketplace/types';
import { verifyPassword } from './password';
import { allow } from './rate-limit';

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/signin' },
  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;
        // 10 attempts per email per 15 minutes
        if (!allow(`login:${email}`, 10, 15 * 60_000)) throw new Error('Too many attempts. Try again in a few minutes.');

        const profile = await getProfileByEmail(email);
        if (!profile || !(await verifyPassword(password, profile.passwordHash))) return null;
        return { id: profile.id, name: profile.name, email: profile.email, role: profile.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      // After a role switch the client calls update(); trust the database, not the browser.
      if (trigger === 'update' && token.id) {
        const profile = await getProfileById(token.id);
        if (profile) token.role = profile.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/**
 * For server components/pages. Re-checks the role against the database (the
 * cookie could be a few minutes stale after a switch in another tab) and
 * redirects when the visitor isn't allowed here.
 */
export async function requirePageUser(role?: Role, callbackUrl = '/'): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  const profile = await getProfileById(session.user.id);
  if (!profile) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (role && profile.role !== role) redirect(`/account?need=${role}&next=${encodeURIComponent(callbackUrl)}`);
  return { id: profile.id, name: profile.name, email: profile.email, role: profile.role };
}

/** For optional personalisation on public pages: the signed-in user, or null. */
export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const profile = await getProfileById(session.user.id);
  return profile ? { id: profile.id, name: profile.name, email: profile.email, role: profile.role } : null;
}
